from io import BytesIO
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
