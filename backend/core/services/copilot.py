from __future__ import annotations

from dataclasses import dataclass
from datetime import timedelta
from decimal import Decimal
from typing import Any, Callable

from django.db.models import Count, DecimalField, Q, Sum, Value
from django.db.models.functions import Coalesce
from django.utils import timezone

from accounting.services.receivables import get_open_invoices
from analytics.models import KPIFactDaily
from core.serializers.copilot import (
    AttendanceReportParamsSerializer,
    PayrollSummaryParamsSerializer,
    ProfitChangeExplainParamsSerializer,
    TopDebtorsParamsSerializer,
    TopLateEmployeesParamsSerializer,
)
from hr.models import AttendanceRecord, Department, PayrollPeriod, PayrollRun


@dataclass(frozen=True)
class CopilotIntent:
    code: str
    permission: str
    params_serializer: type
    handler: Callable[[Any, dict[str, Any]], dict[str, Any]]


def _format_decimal(value: Decimal | None) -> str | None:
    if value is None:
        return None
    return format(value.quantize(Decimal("0.01")), "f")


def _resolve_date_range(params: dict[str, Any], default_days: int = 30):
    end_date = params.get("end_date") or timezone.localdate()
    start_date = params.get("start_date") or end_date - timedelta(days=default_days - 1)
    if start_date > end_date:
        raise ValueError("start_date must be before end_date.")
    return start_date, end_date


def _attendance_report(user, params: dict[str, Any]) -> dict[str, Any]:
    start_date, end_date = _resolve_date_range(params)
    department_id = params.get("department_id")

    queryset = AttendanceRecord.objects.filter(
        company=user.company,
        date__gte=start_date,
        date__lte=end_date,
    ).select_related("employee", "employee__department")

    department_name = None
    if department_id:
        queryset = queryset.filter(employee__department_id=department_id)
        department_name = (
            Department.objects.filter(company=user.company, id=department_id)
            .values_list("name", flat=True)
            .first()
        )

    total_count = queryset.count()
    present_count = queryset.filter(status=AttendanceRecord.Status.PRESENT).count()
    late_count = queryset.filter(status=AttendanceRecord.Status.LATE).count()
    absent_count = queryset.filter(status=AttendanceRecord.Status.ABSENT).count()
    early_leave_count = queryset.filter(status=AttendanceRecord.Status.EARLY_LEAVE).count()

    per_employee = (
        queryset.values(
            "employee_id",
            "employee__full_name",
            "employee__department__name",
        )
        .annotate(
            present=Count("id", filter=Q(status=AttendanceRecord.Status.PRESENT)),
            late=Count("id", filter=Q(status=AttendanceRecord.Status.LATE)),
            absent=Count("id", filter=Q(status=AttendanceRecord.Status.ABSENT)),
            early_leave=Count("id", filter=Q(status=AttendanceRecord.Status.EARLY_LEAVE)),
        )
        .order_by("-late", "employee__full_name")
    )[:500]

    daily = (
        queryset.values("date")
        .annotate(
            present=Count("id", filter=Q(status=AttendanceRecord.Status.PRESENT)),
            late=Count("id", filter=Q(status=AttendanceRecord.Status.LATE)),
            absent=Count("id", filter=Q(status=AttendanceRecord.Status.ABSENT)),
        )
        .order_by("date")
    )[:500]

    title = f"Attendance - {department_name or 'All Departments'} - {start_date} to {end_date}"

    return {
        "intent": "attendance_report",
        "title": title,
        "blocks": [
            {
                "type": "kpi_cards",
                "data": [
                    {"label": "Total Records", "value": total_count},
                    {"label": "Present", "value": present_count},
                    {"label": "Late", "value": late_count},
                    {"label": "Absent", "value": absent_count},
                    {"label": "Early Leave", "value": early_leave_count},
                ],
            },
            {
                "type": "table",
                "columns": [
                    {"key": "employee", "label": "Employee"},
                    {"key": "department", "label": "Department"},
                    {"key": "present", "label": "Present"},
                    {"key": "late", "label": "Late"},
                    {"key": "absent", "label": "Absent"},
                    {"key": "early_leave", "label": "Early Leave"},
                ],
                "rows": [
                    {
                        "employee": row["employee__full_name"],
                        "department": row["employee__department__name"],
                        "present": row["present"],
                        "late": row["late"],
                        "absent": row["absent"],
                        "early_leave": row["early_leave"],
                    }
                    for row in per_employee
                ],
            },
            {
                "type": "chart",
                "variant": "line",
                "xKey": "date",
                "series": [
                    {"key": "present", "label": "Present"},
                    {"key": "late", "label": "Late"},
                    {"key": "absent", "label": "Absent"},
                ],
                "data": [
                    {
                        "date": row["date"].isoformat(),
                        "present": row["present"],
                        "late": row["late"],
                        "absent": row["absent"],
                    }
                    for row in daily
                ],
            },
        ],
    }


def _top_late_employees(user, params: dict[str, Any]) -> dict[str, Any]:
    start_date, end_date = _resolve_date_range(params)
    limit = params.get("limit") or 10

    queryset = (
        AttendanceRecord.objects.filter(
            company=user.company,
            date__gte=start_date,
            date__lte=end_date,
            status=AttendanceRecord.Status.LATE,
        )
        .values("employee_id", "employee__full_name")
        .annotate(
            late_count=Count("id"),
            late_minutes=Coalesce(Sum("late_minutes"), Value(0)),
        )
        .order_by("-late_count", "-late_minutes")
    )[: min(limit, 50)]

    return {
        "intent": "top_late_employees",
        "title": f"Top Late Employees - {start_date} to {end_date}",
        "blocks": [
            {
                "type": "kpi_cards",
                "data": [
                    {"label": "Late Records", "value": sum(row["late_count"] for row in queryset)},
                    {"label": "Employees", "value": len(queryset)},
                ],
            },
            {
                "type": "table",
                "columns": [
                    {"key": "employee", "label": "Employee"},
                    {"key": "late_count", "label": "Late Days"},
                    {"key": "late_minutes", "label": "Late Minutes"},
                ],
                "rows": [
                    {
                        "employee": row["employee__full_name"],
                        "late_count": row["late_count"],
                        "late_minutes": row["late_minutes"],
                    }
                    for row in queryset
                ],
            },
            {
                "type": "chart",
                "variant": "bar",
                "xKey": "employee",
                "series": [{"key": "late_count", "label": "Late Days"}],
                "data": [
                    {
                        "employee": row["employee__full_name"],
                        "late_count": row["late_count"],
                    }
                    for row in queryset
                ],
            },
        ],
    }


def _resolve_payroll_period(company, params: dict[str, Any]):
    year = params.get("year")
    month = params.get("month")
    if year and month:
        return PayrollPeriod.objects.filter(company=company, year=year, month=month).first()

    latest = (
        PayrollPeriod.objects.filter(company=company)
        .order_by("-year", "-month")
        .first()
    )
    if latest:
        return latest

    today = timezone.localdate()
    return PayrollPeriod.objects.filter(
        company=company, year=today.year, month=today.month
    ).first()


def _payroll_summary(user, params: dict[str, Any]) -> dict[str, Any]:
    period = _resolve_payroll_period(user.company, params)
    if not period:
        return {
            "intent": "payroll_summary",
            "title": "Payroll Summary",
            "blocks": [
                {
                    "type": "kpi_cards",
                    "data": [
                        {"label": "Payroll Period", "value": "No data"},
                    ],
                }
            ],
        }

    runs = PayrollRun.objects.filter(company=user.company, period=period)
    totals = runs.aggregate(
        earnings=Coalesce(
            Sum("earnings_total"),
            Value(0, output_field=DecimalField(max_digits=14, decimal_places=2)),
        ),
        deductions=Coalesce(
            Sum("deductions_total"),
            Value(0, output_field=DecimalField(max_digits=14, decimal_places=2)),
        ),
        net=Coalesce(
            Sum("net_total"),
            Value(0, output_field=DecimalField(max_digits=14, decimal_places=2)),
        ),
    )

    top_runs = runs.select_related("employee").order_by("-net_total")[:50]

    return {
        "intent": "payroll_summary",
        "title": f"Payroll Summary - {period.year}/{period.month:02d}",
        "blocks": [
            {
                "type": "kpi_cards",
                "data": [
                    {"label": "Employees", "value": runs.count()},
                    {"label": "Total Earnings", "value": _format_decimal(totals["earnings"])},
                    {"label": "Total Deductions", "value": _format_decimal(totals["deductions"])},
                    {"label": "Net Total", "value": _format_decimal(totals["net"])},
                ],
            },
            {
                "type": "table",
                "columns": [
                    {"key": "employee", "label": "Employee"},
                    {"key": "earnings", "label": "Earnings"},
                    {"key": "deductions", "label": "Deductions"},
                    {"key": "net", "label": "Net"},
                ],
                "rows": [
                    {
                        "employee": run.employee.full_name,
                        "earnings": _format_decimal(run.earnings_total),
                        "deductions": _format_decimal(run.deductions_total),
                        "net": _format_decimal(run.net_total),
                    }
                    for run in top_runs
                ],
            },
            {
                "type": "chart",
                "variant": "bar",
                "xKey": "employee",
                "series": [{"key": "net", "label": "Net"}],
                "data": [
                    {
                        "employee": run.employee.full_name,
                        "net": float(run.net_total),
                    }
                    for run in top_runs
                ],
            },
        ],
    }


def _top_debtors(user, params: dict[str, Any]) -> dict[str, Any]:
    limit = params.get("limit") or 10

    open_invoices = get_open_invoices(user.company)
    per_customer = (
        open_invoices.values("customer_id", "customer__name")
        .annotate(
            total_balance=Coalesce(
                Sum("remaining_balance"),
                Value(0, output_field=DecimalField(max_digits=14, decimal_places=2)),
            ),
            invoice_count=Count("id"),
        )
        .order_by("-total_balance")
    )[: min(limit, 50)]

    return {
        "intent": "top_debtors",
        "title": "Top Debtors",
        "blocks": [
            {
                "type": "kpi_cards",
                "data": [
                    {"label": "Customers", "value": len(per_customer)},
                    {
                        "label": "Total Outstanding",
                        "value": _format_decimal(
                            sum((row["total_balance"] for row in per_customer), Decimal("0"))
                        ),
                    },
                ],
            },
            {
                "type": "table",
                "columns": [
                    {"key": "customer", "label": "Customer"},
                    {"key": "balance", "label": "Outstanding"},
                    {"key": "invoices", "label": "Open Invoices"},
                ],
                "rows": [
                    {
                        "customer": row["customer__name"],
                        "balance": _format_decimal(row["total_balance"]),
                        "invoices": row["invoice_count"],
                    }
                    for row in per_customer
                ],
            },
            {
                "type": "chart",
                "variant": "bar",
                "xKey": "customer",
                "series": [{"key": "balance", "label": "Outstanding"}],
                "data": [
                    {
                        "customer": row["customer__name"],
                        "balance": float(row["total_balance"]),
                    }
                    for row in per_customer
                ],
            },
        ],
    }


def _profit_change_explain(user, params: dict[str, Any]) -> dict[str, Any]:
    start_date, end_date = _resolve_date_range(params)
    days = (end_date - start_date).days + 1
    prev_end = start_date - timedelta(days=1)
    prev_start = prev_end - timedelta(days=days - 1)

    revenue_key = "revenue_daily"
    expenses_key = "expenses_daily"

    def _facts_for_range(range_start, range_end):
        facts = KPIFactDaily.objects.filter(
            company=user.company,
            date__gte=range_start,
            date__lte=range_end,
            kpi_key__in=[revenue_key, expenses_key],
        )
        result: dict[str, dict[str, Decimal]] = {}
        for fact in facts:
            result.setdefault(fact.date.isoformat(), {})[fact.kpi_key] = fact.value
        return result

    current = _facts_for_range(start_date, end_date)
    previous = _facts_for_range(prev_start, prev_end)

    dates = [start_date + timedelta(days=offset) for offset in range(days)]
    chart_data = []
    current_net_total = Decimal("0")
    previous_net_total = Decimal("0")

    for date in dates:
        key = date.isoformat()
        current_rev = current.get(key, {}).get(revenue_key, Decimal("0"))
        current_exp = current.get(key, {}).get(expenses_key, Decimal("0"))
        previous_rev = previous.get(key, {}).get(revenue_key, Decimal("0"))
        previous_exp = previous.get(key, {}).get(expenses_key, Decimal("0"))

        current_net = current_rev - current_exp
        previous_net = previous_rev - previous_exp

        current_net_total += current_net
        previous_net_total += previous_net

        chart_data.append(
            {
                "date": key,
                "current_net": float(current_net),
                "previous_net": float(previous_net),
            }
        )

    change = current_net_total - previous_net_total
    percent_change = None
    if previous_net_total != 0:
        percent_change = (change / previous_net_total) * Decimal("100")

    return {
        "intent": "profit_change_explain",
        "title": f"Profit Change - {start_date} to {end_date}",
        "blocks": [
            {
                "type": "kpi_cards",
                "data": [
                    {"label": "Current Net", "value": _format_decimal(current_net_total)},
                    {"label": "Previous Net", "value": _format_decimal(previous_net_total)},
                    {"label": "Change", "value": _format_decimal(change)},
                    {
                        "label": "Change %",
                        "value": _format_decimal(percent_change) if percent_change is not None else None,
                    },
                ],
            },
            {
                "type": "chart",
                "variant": "line",
                "xKey": "date",
                "series": [
                    {"key": "current_net", "label": "Current"},
                    {"key": "previous_net", "label": "Previous"},
                ],
                "data": chart_data,
            },
        ],
    }


INTENTS: dict[str, CopilotIntent] = {
    "attendance_report": CopilotIntent(
        code="attendance_report",
        permission="copilot.attendance_report",
        params_serializer=AttendanceReportParamsSerializer,
        handler=_attendance_report,
    ),
    "top_late_employees": CopilotIntent(
        code="top_late_employees",
        permission="copilot.top_late_employees",
        params_serializer=TopLateEmployeesParamsSerializer,
        handler=_top_late_employees,
    ),
    "payroll_summary": CopilotIntent(
        code="payroll_summary",
        permission="copilot.payroll_summary",
        params_serializer=PayrollSummaryParamsSerializer,
        handler=_payroll_summary,
    ),
    "top_debtors": CopilotIntent(
        code="top_debtors",
        permission="copilot.top_debtors",
        params_serializer=TopDebtorsParamsSerializer,
        handler=_top_debtors,
    ),
    "profit_change_explain": CopilotIntent(
        code="profit_change_explain",
        permission="copilot.profit_change_explain",
        params_serializer=ProfitChangeExplainParamsSerializer,
        handler=_profit_change_explain,
    ),
}


def get_intent(intent_code: str) -> CopilotIntent | None:
    return INTENTS.get(intent_code)