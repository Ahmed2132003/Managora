from __future__ import annotations

from datetime import date, datetime, timedelta
from decimal import Decimal

from celery import shared_task
from django.db import transaction
from django.db.models import Sum
from django.db.models.functions import Coalesce
from django.utils import timezone

from accounting.models import Expense
from analytics.models import AnalyticsJobRun, KPIContributionDaily, KPIDefinition, KPIFactDaily
from core.models import Company
from hr.models import AttendanceRecord, Employee

KPI_CATALOG = {
    "expenses_daily": {
        "name": "Daily Expenses",
        "category": KPIDefinition.Category.FINANCE,
        "unit": KPIDefinition.Unit.CURRENCY,
        "description": "Approved expenses total per day.",
        "formula_hint": "Sum of approved expenses.",
    },
    "absence_rate_daily": {
        "name": "Daily Absence Rate",
        "category": KPIDefinition.Category.HR,
        "unit": KPIDefinition.Unit.PERCENT,
        "description": "Absent employees divided by active employees.",
        "formula_hint": "absent / active",
    },
    "lateness_rate_daily": {
        "name": "Daily Lateness Rate",
        "category": KPIDefinition.Category.HR,
        "unit": KPIDefinition.Unit.PERCENT,
        "description": "Late records divided by present records.",
        "formula_hint": "late / present",
    },
    "expense_by_category_daily": {
        "name": "Expense by Category",
        "category": KPIDefinition.Category.OPS,
        "unit": KPIDefinition.Unit.CURRENCY,
        "description": "Expense totals grouped by category.",
        "formula_hint": "Sum of approved expenses by category.",
    },
    "top_vendors_daily": {
        "name": "Top Vendors",
        "category": KPIDefinition.Category.OPS,
        "unit": KPIDefinition.Unit.CURRENCY,
        "description": "Top vendors by spend.",
        "formula_hint": "Top vendors by approved expenses.",
    },
}


def _coerce_date(value: date | str) -> date:
    if isinstance(value, date):
        return value
    return datetime.strptime(value, "%Y-%m-%d").date()


def _ensure_kpi_definition(company: Company, kpi_key: str) -> None:
    definition = KPI_CATALOG.get(kpi_key)
    if not definition:
        return
    KPIDefinition.objects.update_or_create(
        company=company,
        key=kpi_key,
        defaults={
            "name": definition["name"],
            "category": definition["category"],
            "unit": definition["unit"],
            "description": definition["description"],
            "formula_hint": definition["formula_hint"],
            "is_active": True,
        },
    )


@shared_task
def build_kpis_daily(company_id: int, target_date: str | date) -> dict[str, str]:
    company = Company.objects.get(id=company_id)
    day = _coerce_date(target_date)

    results: dict[str, Decimal] = {}

    expenses_total = Expense.objects.filter(
        company=company,
        date=day,
        status=Expense.Status.APPROVED,
    ).aggregate(total=Coalesce(Sum("amount"), Decimal("0")))["total"]
    results["expenses_daily"] = expenses_total

    active_employees = Employee.objects.filter(
        company=company, status=Employee.Status.ACTIVE
    ).count()
    absent_count = AttendanceRecord.objects.filter(
        company=company,
        date=day,
        status=AttendanceRecord.Status.ABSENT,
    ).count()
    late_count = AttendanceRecord.objects.filter(
        company=company,
        date=day,
        status=AttendanceRecord.Status.LATE,
    ).count()
    present_count = AttendanceRecord.objects.filter(
        company=company,
        date=day,
        status=AttendanceRecord.Status.PRESENT,
    ).count()

    absence_rate = (
        Decimal(absent_count) / Decimal(active_employees)
        if active_employees
        else Decimal("0")
    )
    lateness_rate = (
        Decimal(late_count) / Decimal(present_count)
        if present_count
        else Decimal("0")
    )

    results["absence_rate_daily"] = absence_rate
    results["lateness_rate_daily"] = lateness_rate

    for kpi_key, value in results.items():
        _ensure_kpi_definition(company, kpi_key)
        KPIFactDaily.objects.update_or_create(
            company=company,
            date=day,
            kpi_key=kpi_key,
            defaults={
                "value": value,
                "meta": {
                    "active_employees": active_employees,
                    "absent_count": absent_count,
                    "late_count": late_count,
                    "present_count": present_count,
                }
                if kpi_key in {"absence_rate_daily", "lateness_rate_daily"}
                else {},
            },
        )

    return {key: str(value) for key, value in results.items()}


@shared_task
def build_kpi_contributions_daily(company_id: int, target_date: str | date) -> int:
    company = Company.objects.get(id=company_id)
    day = _coerce_date(target_date)

    contributions: list[KPIContributionDaily] = []

    categories = (
        Expense.objects.filter(
            company=company,
            date=day,
            status=Expense.Status.APPROVED,
        )
        .exclude(category="")
        .values("category")
        .annotate(total=Coalesce(Sum("amount"), Decimal("0")))
        .order_by("-total")[:10]
    )
    if categories:
        _ensure_kpi_definition(company, "expense_by_category_daily")
    for item in categories:
        contributions.append(
            KPIContributionDaily(
                company=company,
                date=day,
                kpi_key="expense_by_category_daily",
                dimension="expense_category",
                dimension_id=item["category"],
                amount=item["total"],
            )
        )

    vendors = (
        Expense.objects.filter(
            company=company,
            date=day,
            status=Expense.Status.APPROVED,
        )
        .exclude(vendor_name="")
        .values("vendor_name")
        .annotate(total=Coalesce(Sum("amount"), Decimal("0")))
        .order_by("-total")[:10]
    )
    if vendors:
        _ensure_kpi_definition(company, "top_vendors_daily")
    for item in vendors:
        contributions.append(
            KPIContributionDaily(
                company=company,
                date=day,
                kpi_key="top_vendors_daily",
                dimension="vendor",
                dimension_id=item["vendor_name"],
                amount=item["total"],
            )
        )

    if not contributions:
        return 0

    with transaction.atomic():
        KPIContributionDaily.objects.filter(
            company=company,
            date=day,
            kpi_key__in=["expense_by_category_daily", "top_vendors_daily"],
        ).delete()
        KPIContributionDaily.objects.bulk_create(contributions)

    return len(contributions)


@shared_task
def build_analytics_range(
    company_id: int, start_date: str | date, end_date: str | date
) -> dict[str, str]:
    company = Company.objects.get(id=company_id)
    start = _coerce_date(start_date)
    end = _coerce_date(end_date)

    job_run = AnalyticsJobRun.objects.create(
        company=company,
        job_key="kpi_daily_build",
        period_start=start,
        period_end=end,
        status=AnalyticsJobRun.Status.RUNNING,
    )

    try:
        current = start
        days_processed = 0
        while current <= end:
            build_kpis_daily(company_id, current)
            build_kpi_contributions_daily(company_id, current)
            current += timedelta(days=1)
            days_processed += 1

        job_run.status = AnalyticsJobRun.Status.SUCCESS
        job_run.stats = {"days_processed": days_processed}
        job_run.finished_at = timezone.now()
        job_run.save(update_fields=["status", "stats", "finished_at"])
    except Exception as exc:  # pragma: no cover - guardrail
        job_run.status = AnalyticsJobRun.Status.FAILED
        job_run.error = str(exc)
        job_run.finished_at = timezone.now()
        job_run.save(update_fields=["status", "error", "finished_at"])
        raise

    return {
        "status": job_run.status,
        "days_processed": str(job_run.stats.get("days_processed", 0)),
    }


@shared_task
def build_yesterday_kpis() -> dict[str, str]:
    yesterday = timezone.localdate() - timedelta(days=1)
    results = {}
    for company_id in Company.objects.values_list("id", flat=True):
        build_kpis_daily(company_id, yesterday)
        build_kpi_contributions_daily(company_id, yesterday)
        results[str(company_id)] = "ok"
    return results


@shared_task
def backfill_last_30_days() -> dict[str, str]:
    today = timezone.localdate()
    start = today - timedelta(days=30)
    results = {}
    for company_id in Company.objects.values_list("id", flat=True):
        results[str(company_id)] = build_analytics_range(company_id, start, today)[
            "status"
        ]
    return results