from io import BytesIO
from PIL import Image, ImageDraw, ImageFont
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

def render_payslip_pdf(payroll_run):
    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    def line(y, label, value):
        pdf.setFont("Helvetica", 10)
        pdf.drawString(20 * mm, y, str(label))
        pdf.drawRightString(width - 20 * mm, y, str(value))
        return y - 5 * mm

    y = height - 20 * mm

    # Header
    pdf.setFont("Helvetica-Bold", 14)
    pdf.drawString(20 * mm, y, payroll_run.company.name)
    y -= 8 * mm

    pdf.setFont("Helvetica", 10)
    pdf.drawString(20 * mm, y, f"Employee: {payroll_run.employee.full_name}")
    y -= 5 * mm
    pdf.drawString(20 * mm, y, f"Employee Code: {payroll_run.employee.employee_code}")
    y -= 5 * mm

    period = payroll_run.period
    pdf.drawString(20 * mm, y, f"Period: {period.start_date} to {period.end_date}")
    y -= 10 * mm

    # Run Details (زي اللي في UI)
    pdf.setFont("Helvetica-Bold", 11)
    pdf.drawString(20 * mm, y, "Run details")
    y -= 7 * mm

    # Basic / Payable
    basic = getattr(payroll_run, "basic_salary", None) or getattr(payroll_run, "basic", None) or ""
    payable = getattr(payroll_run, "net_total", 0)

    y = line(y, "Basic", f"{basic}" if basic != "" else f"{getattr(payroll_run, 'earnings_total', 0):.2f}")
    y = line(y, "Earnings total", f"{payroll_run.earnings_total:.2f}")
    y = line(y, "Deductions total", f"{payroll_run.deductions_total:.2f}")
    y = line(y, "Payable (Net)", f"{payable:.2f}")
    y -= 4 * mm

    # Lines table
    pdf.setFont("Helvetica-Bold", 11)
    pdf.drawString(20 * mm, y, "Lines")
    y -= 7 * mm

    pdf.setFont("Helvetica-Bold", 10)
    pdf.drawString(22 * mm, y, "Name")
    pdf.drawString(110 * mm, y, "Type")
    pdf.drawRightString(width - 20 * mm, y, "Amount")
    y -= 6 * mm

    pdf.setFont("Helvetica", 10)
    for l in payroll_run.lines.all():
        if y < 25 * mm:
            pdf.showPage()
            y = height - 20 * mm
            pdf.setFont("Helvetica-Bold", 10)
            pdf.drawString(22 * mm, y, "Name")
            pdf.drawString(110 * mm, y, "Type")
            pdf.drawRightString(width - 20 * mm, y, "Amount")
            y -= 6 * mm
            pdf.setFont("Helvetica", 10)

        pdf.drawString(22 * mm, y, str(l.name))
        pdf.drawString(110 * mm, y, str(l.type))
        pdf.drawRightString(width - 20 * mm, y, f"{l.amount:.2f}")
        y -= 5 * mm

    pdf.save()
    buffer.seek(0)
    return buffer.getvalue()


def _load_font(size, bold=False):
    font_name = "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"
    try:
        return ImageFont.truetype(font_name, size)
    except OSError:
        return ImageFont.load_default()


def _right_aligned(draw, text, font, right_x, y, fill):
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    draw.text((right_x - text_width, y), text, font=font, fill=fill)


def render_payslip_png(payroll_run):
    line_height = 26
    base_height = 700
    lines_count = payroll_run.lines.count()
    height = max(1754, base_height + lines_count * line_height)
    width = 1240

    image = Image.new("RGB", (width, height), "white")
    draw = ImageDraw.Draw(image)

    title_font = _load_font(24, bold=True)
    heading_font = _load_font(18, bold=True)
    text_font = _load_font(14)
    bold_font = _load_font(14, bold=True)

    margin_x = 80
    right_x = width - margin_x
    y = 60

    draw.text((margin_x, y), str(payroll_run.company.name), font=title_font, fill="black")
    y += 40

    draw.text(
        (margin_x, y),
        f"Employee: {payroll_run.employee.full_name}",
        font=text_font,
        fill="black",
    )
    y += 26
    draw.text(
        (margin_x, y),
        f"Employee Code: {payroll_run.employee.employee_code}",
        font=text_font,
        fill="black",
    )
    y += 26

    period = payroll_run.period
    draw.text(
        (margin_x, y),
        f"Period: {period.start_date} to {period.end_date}",
        font=text_font,
        fill="black",
    )
    y += 40

    draw.text((margin_x, y), "Run details", font=heading_font, fill="black")
    y += 30

    basic = getattr(payroll_run, "basic_salary", None) or getattr(payroll_run, "basic", None)
    basic_value = f"{basic}" if basic not in (None, "") else f"{payroll_run.earnings_total:.2f}"

    def detail_line(label, value):
        nonlocal y
        draw.text((margin_x, y), str(label), font=text_font, fill="black")
        _right_aligned(draw, str(value), text_font, right_x, y, "black")
        y += line_height

    detail_line("Basic", basic_value)
    detail_line("Earnings total", f"{payroll_run.earnings_total:.2f}")
    detail_line("Deductions total", f"{payroll_run.deductions_total:.2f}")
    detail_line("Payable (Net)", f"{payroll_run.net_total:.2f}")
    y += 16

    draw.text((margin_x, y), "Lines", font=heading_font, fill="black")
    y += 28

    draw.text((margin_x, y), "Name", font=bold_font, fill="black")
    draw.text((margin_x + 520, y), "Type", font=bold_font, fill="black")
    _right_aligned(draw, "Amount", bold_font, right_x, y, "black")
    y += 22

    for line in payroll_run.lines.all():
        draw.text((margin_x, y), str(line.name), font=text_font, fill="black")
        draw.text((margin_x + 520, y), str(line.type), font=text_font, fill="black")
        _right_aligned(draw, f"{line.amount:.2f}", text_font, right_x, y, "black")
        y += 22

    buffer = BytesIO()
    image.save(buffer, format="PNG")
    buffer.seek(0)
    return buffer.getvalue()
