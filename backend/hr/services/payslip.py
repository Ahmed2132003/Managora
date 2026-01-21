from io import BytesIO

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

from hr.models import PayrollLine


def render_payslip_pdf(payroll_run):
    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    y = height - 20 * mm
    pdf.setFont("Helvetica-Bold", 14)
    pdf.drawString(20 * mm, y, payroll_run.company.name)
    y -= 8 * mm

    pdf.setFont("Helvetica", 10)
    pdf.drawString(20 * mm, y, f"Employee: {payroll_run.employee.full_name}")
    y -= 5 * mm
    pdf.drawString(20 * mm, y, f"Employee Code: {payroll_run.employee.employee_code}")
    y -= 5 * mm
    pdf.drawString(
        20 * mm,
        y,
        f"Period: {payroll_run.period.year}-{payroll_run.period.month:02d}",
    )
    y -= 10 * mm

    earnings = payroll_run.lines.filter(type=PayrollLine.LineType.EARNING)
    deductions = payroll_run.lines.filter(type=PayrollLine.LineType.DEDUCTION)

    pdf.setFont("Helvetica-Bold", 11)
    pdf.drawString(20 * mm, y, "Earnings")
    y -= 6 * mm

    pdf.setFont("Helvetica", 10)
    for line in earnings:
        pdf.drawString(22 * mm, y, line.name)
        pdf.drawRightString(width - 20 * mm, y, f"{line.amount:.2f}")
        y -= 5 * mm
        if y < 30 * mm:
            pdf.showPage()
            y = height - 20 * mm

    y -= 4 * mm
    pdf.setFont("Helvetica-Bold", 11)
    pdf.drawString(20 * mm, y, "Deductions")
    y -= 6 * mm

    pdf.setFont("Helvetica", 10)
    for line in deductions:
        pdf.drawString(22 * mm, y, line.name)
        pdf.drawRightString(width - 20 * mm, y, f"{line.amount:.2f}")
        y -= 5 * mm
        if y < 30 * mm:
            pdf.showPage()
            y = height - 20 * mm

    y -= 8 * mm
    pdf.setFont("Helvetica-Bold", 11)
    pdf.drawString(20 * mm, y, "Net Pay")
    pdf.drawRightString(width - 20 * mm, y, f"{payroll_run.net_total:.2f}")

    pdf.showPage()
    pdf.save()
    buffer.seek(0)
    return buffer.getvalue()