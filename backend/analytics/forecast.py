from __future__ import annotations

import calendar
from datetime import date, datetime, timedelta
from decimal import Decimal

from django.db.models import Sum
from django.utils import timezone

from accounting.models import Expense, Invoice, Payment
from analytics.models import CashForecastSnapshot
from core.models import Company
from hr.models import PayrollPeriod, PayrollRun


def _coerce_date(value: date | str | None) -> date:
    if value is None:
        return timezone.localdate()
    if isinstance(value, date):
        return value
    return datetime.strptime(value, "%Y-%m-%d").date()


def _safe_divide(numerator: Decimal, denominator: Decimal) -> Decimal:
    if denominator <= 0:
        return Decimal("0")
    return numerator / denominator


def _month_end(year: int, month: int) -> date:
    last_day = calendar.monthrange(year, month)[1]
    return date(year, month, last_day)


def _add_months(input_date: date, months: int) -> date:
    year = input_date.year + (input_date.month - 1 + months) // 12
    month = (input_date.month - 1 + months) % 12 + 1
    return _month_end(year, month)


def _format_decimal(value: Decimal, quant: str = "0.01") -> str:
    return str(value.quantize(Decimal(quant)))


def _collection_rate(company: Company, as_of_date: date) -> Decimal:
    window_start = as_of_date - timedelta(days=90)
    invoices_due = (
        Invoice.objects.filter(
            company=company,
            due_date__gte=window_start,
            due_date__lte=as_of_date,
            status__in=[
                Invoice.Status.ISSUED,
                Invoice.Status.PARTIALLY_PAID,
                Invoice.Status.PAID,
            ],
        ).aggregate(total=Sum("total_amount"))
    )["total"] or Decimal("0")

    payments_total = (
        Payment.objects.filter(
            company=company,
            payment_date__gte=window_start,
            payment_date__lte=as_of_date,
        ).aggregate(total=Sum("amount"))
    )["total"] or Decimal("0")

    if invoices_due > 0 and payments_total == 0:
        return Decimal("1")

    rate = _safe_divide(payments_total, invoices_due)
    if rate > Decimal("1"):
        return Decimal("1")
    return rate

def _recurring_monthly_expense(company: Company, as_of_date: date) -> Decimal:
    window_start = as_of_date - timedelta(days=90)
    total_expenses = (
        Expense.objects.filter(
            company=company,
            status=Expense.Status.APPROVED,
            date__gte=window_start,
            date__lte=as_of_date,
        ).aggregate(total=Sum("amount"))
    )["total"] or Decimal("0")
    return total_expenses / Decimal("3") if total_expenses else Decimal("0")


def _latest_payroll_estimate(company: Company, as_of_date: date) -> tuple[Decimal, date | None]:
    last_period = (
        PayrollPeriod.objects.filter(company=company, runs__isnull=False)
        .distinct()
        .order_by("-year", "-month")
        .first()
    )
    if not last_period:
        return Decimal("0"), None

    payroll_total = (
        PayrollRun.objects.filter(period=last_period).aggregate(total=Sum("net_total"))
    )["total"] or Decimal("0")

    payroll_date = _month_end(last_period.year, last_period.month)
    if payroll_date < as_of_date:
        payroll_date = _add_months(payroll_date, 1)
    return payroll_total, payroll_date


def _scale_monthly(monthly_value: Decimal, horizon_days: int) -> Decimal:
    return monthly_value * (Decimal(horizon_days) / Decimal("30"))


def build_cash_forecast(company_id: int, as_of_date: date | str | None = None):
    company = Company.objects.get(id=company_id)
    as_of_date = _coerce_date(as_of_date)
    collection_rate = _collection_rate(company, as_of_date)
    recurring_monthly = _recurring_monthly_expense(company, as_of_date)
    payroll_estimate, payroll_date = _latest_payroll_estimate(company, as_of_date)

    snapshots = []
    for horizon_days in (30, 60, 90):
        horizon_end = as_of_date + timedelta(days=horizon_days)

        invoices_due_qs = Invoice.objects.filter(
            company=company,
            due_date__gte=as_of_date,
            due_date__lte=horizon_end,
            status__in=[Invoice.Status.ISSUED, Invoice.Status.PARTIALLY_PAID],
        )
        invoices_total = (
            invoices_due_qs.aggregate(total=Sum("total_amount"))["total"]
            or Decimal("0")
        )
        expected_inflows = invoices_total * collection_rate

 
        top_customers = []
        for row in (
            invoices_due_qs.values("customer__name")
            .exclude(customer__name__isnull=True)
            .exclude(customer__name="")
            .annotate(total=Sum("total_amount"))
            .order_by("-total")[:5]
        ):            
            top_customers.append(
                {
                    "customer": row["customer__name"],
                    "amount": _format_decimal(row["total"] * collection_rate),
                }
            )

        recurring_expected = _scale_monthly(recurring_monthly, horizon_days)

        payroll_expected = Decimal("0")
        if payroll_date and as_of_date <= payroll_date <= horizon_end:
            payroll_expected = payroll_estimate

        outflows_total = recurring_expected + payroll_expected
        net_expected = expected_inflows - outflows_total

        expense_category_rows = (
            Expense.objects.filter(
                company=company,
                status=Expense.Status.APPROVED,
                date__gte=as_of_date - timedelta(days=90),
                date__lte=as_of_date,
            )
            .values("category")
            .annotate(total=Sum("amount"))
            .order_by("-total")[:5]
        )
        top_categories = []
        for row in expense_category_rows:
            category = row["category"] or "غير مصنف"
            monthly_value = (row["total"] or Decimal("0")) / Decimal("3")
            top_categories.append(
                {
                    "category": category,
                    "amount": _format_decimal(_scale_monthly(monthly_value, horizon_days)),
                }
            )

        details = {
            "inflows_by_bucket": {
                "invoices_due": _format_decimal(invoices_total),
                "expected_collected": _format_decimal(expected_inflows),
                "top_customers": top_customers,
            },
            "outflows_by_bucket": {
                "payroll": _format_decimal(payroll_expected),
                "recurring_expenses": _format_decimal(recurring_expected),
                "top_categories": top_categories,
            },
            "assumptions": {
                "collection_rate": _format_decimal(collection_rate, "0.0001"),
                "recurring_expense_est": _format_decimal(recurring_monthly),
                "payroll_est": _format_decimal(payroll_estimate),
                "payroll_date": payroll_date.isoformat() if payroll_date else None,
            },
        }

        snapshot, _ = CashForecastSnapshot.objects.update_or_create(
            company=company,
            as_of_date=as_of_date,
            horizon_days=horizon_days,
            defaults={
                "expected_inflows": expected_inflows,
                "expected_outflows": outflows_total,
                "net_expected": net_expected,
                "details": details,
            },
        )
        snapshots.append(snapshot)

    return snapshots