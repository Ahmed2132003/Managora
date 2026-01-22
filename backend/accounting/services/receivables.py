from django.db.models import DecimalField, ExpressionWrapper, F, Sum, Value
from django.db.models.functions import Coalesce

from accounting.models import Invoice


def get_open_invoices(company):
    total_paid = Coalesce(
        Sum("payments__amount"),
        Value(0),
        output_field=DecimalField(max_digits=14, decimal_places=2),
    )
    remaining_balance = ExpressionWrapper(
        F("total_amount") - total_paid,
        output_field=DecimalField(max_digits=14, decimal_places=2),
    )
    return (
        Invoice.objects.filter(company=company)
        .annotate(total_paid=total_paid, remaining_balance=remaining_balance)
        .filter(remaining_balance__gt=0)
    )