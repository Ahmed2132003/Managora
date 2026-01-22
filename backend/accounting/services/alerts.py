from decimal import Decimal

from django.utils import timezone

from accounting.models import Alert
from accounting.services.receivables import get_open_invoices


def _format_amount(amount):
    return f"{Decimal(amount):.2f}"


def generate_alerts(company, overdue_days=30, today=None):
    if today is None:
        today = timezone.now().date()
    overdue_invoices = (
        get_open_invoices(company)
        .filter(due_date__lt=today)
        .select_related("customer")
    )

    for invoice in overdue_invoices:
        days_overdue = (today - invoice.due_date).days
        if days_overdue <= overdue_days:
            continue
        Alert.objects.get_or_create(
            company=company,
            type=Alert.Type.OVERDUE_INVOICE,
            entity_id=str(invoice.id),
            defaults={
                "severity": Alert.Severity.HIGH,
                "message": (
                    f"Invoice {invoice.invoice_number} for {invoice.customer.name} "
                    f"is overdue by {days_overdue} days."
                ),
            },
        )

    overdue_by_customer = {}
    for invoice in overdue_invoices:
        customer = invoice.customer
        overdue_by_customer.setdefault(customer.id, {"customer": customer, "total": Decimal("0")})
        overdue_by_customer[customer.id]["total"] += Decimal(invoice.remaining_balance)

    for entry in overdue_by_customer.values():
        customer = entry["customer"]
        if not customer.credit_limit:
            continue
        total_overdue = entry["total"]
        if total_overdue <= customer.credit_limit:
            continue
        Alert.objects.get_or_create(
            company=company,
            type=Alert.Type.CREDIT_LIMIT,
            entity_id=str(customer.id),
            defaults={
                "severity": Alert.Severity.HIGH,
                "message": (
                    f"Customer {customer.name} overdue total "
                    f"{_format_amount(total_overdue)} exceeds credit limit "
                    f"{_format_amount(customer.credit_limit)}."
                ),
            },
        )