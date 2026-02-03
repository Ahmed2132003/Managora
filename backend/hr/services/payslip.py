from io import BytesIO

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

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
    period = payroll_run.period
    period_label = f"{period.start_date} to {period.end_date}"
    pdf.drawString(
        20 * mm,
        y,
        f"Period: {period_label}",
    )    
    y -= 10 * mm

    all_lines = payroll_run.lines.all()
    
    pdf.setFont("Helvetica-Bold", 11)
    pdf.drawString(20 * mm, y, "Summary")
    y -= 6 * mm

    pdf.setFont("Helvetica", 10)
    pdf.drawString(22 * mm, y, "Earnings Total")
    pdf.drawRightString(width - 20 * mm, y, f"{payroll_run.earnings_total:.2f}")
    y -= 5 * mm
    pdf.drawString(22 * mm, y, "Deductions Total")
    pdf.drawRightString(width - 20 * mm, y, f"{payroll_run.deductions_total:.2f}")
    y -= 5 * mm
    pdf.drawString(22 * mm, y, "Net Pay")
    pdf.drawRightString(width - 20 * mm, y, f"{payroll_run.net_total:.2f}")
    y -= 8 * mm

    pdf.setFont("Helvetica-Bold", 11)
    pdf.drawString(20 * mm, y, "Lines")
    y -= 6 * mm

    pdf.setFont("Helvetica-Bold", 10)
    pdf.drawString(22 * mm, y, "Name")
    pdf.drawString(110 * mm, y, "Type")
    pdf.drawRightString(width - 20 * mm, y, "Amount")
    y -= 5 * mm
    pdf.setFont("Helvetica", 10)
    for line in all_lines:
        pdf.drawString(22 * mm, y, line.name)
        pdf.drawString(110 * mm, y, str(line.type))
        pdf.drawRightString(width - 20 * mm, y, f"{line.amount:.2f}")
        y -= 5 * mm
        if y < 30 * mm:
            pdf.showPage()
            y = height - 20 * mm
    pdf.save()
    buffer.seek(0)
    return buffer.getvalue()

def render_payslip_png(payroll_run, dpi: int = 200) -> bytes:
    """Render payslip as PNG bytes (first page) using PyMuPDF (fitz)."""
    import fitz  # PyMuPDF

    pdf_bytes = render_payslip_pdf(payroll_run)
    # Safety: ensure PDF signature
    if not pdf_bytes or pdf_bytes[:4] != b"%PDF":
        raise ValueError("Invalid PDF bytes generated for payslip")

    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    try:
        page = doc.load_page(0)
        pix = page.get_pixmap(dpi=dpi, alpha=False)
        return pix.tobytes("png")
    finally:
        doc.close()
