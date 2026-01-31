from calendar import monthrange
from datetime import date
from decimal import Decimal

from django.db import transaction
from django.db.models import Sum
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from hr.models import (
    AttendanceRecord,
    Employee,
    LeaveRequest,
    LoanAdvance,
    PayrollLine,
    PayrollPeriod,
    PayrollRun,
    SalaryComponent,
    SalaryStructure,
    CommissionRequest,
)

WORKING_DAYS_PER_MONTH = Decimal("30")
MINUTES_PER_DAY = Decimal("480")


def _resolve_daily_rate(salary_structure: SalaryStructure) -> Decimal | None:
    if salary_structure.salary_type == SalaryStructure.SalaryType.DAILY:
        return salary_structure.basic_salary
    if salary_structure.salary_type == SalaryStructure.SalaryType.WEEKLY:
        return salary_structure.basic_salary / Decimal("7")
    if salary_structure.salary_type == SalaryStructure.SalaryType.COMMISSION:
        return None
    return salary_structure.basic_salary / WORKING_DAYS_PER_MONTH

def _month_date_range(year, month):
    last_day = monthrange(year, month)[1]
    start_date = date(year, month, 1)
    end_date = date(year, month, last_day)
    return start_date, end_date


def _quantize_amount(amount):
    return amount.quantize(Decimal("0.01"))


def _overlap_days(start_date, end_date, range_start, range_end):
    overlap_start = max(start_date, range_start)
    overlap_end = min(end_date, range_end)
    if overlap_start > overlap_end:
        return Decimal("0")
    return Decimal((overlap_end - overlap_start).days + 1)


def generate_period(company, year, month, actor):
    try:
        period = PayrollPeriod.objects.get(company=company, year=year, month=month)
    except PayrollPeriod.DoesNotExist as exc:
        raise ValidationError("Payroll period does not exist.") from exc

    if period.status == PayrollPeriod.Status.LOCKED:
        raise ValidationError("Payroll period is locked.")

    start_date, end_date = _month_date_range(year, month)
    employees = Employee.objects.filter(
        company=company, status=Employee.Status.ACTIVE
    ).select_related("salary_structure")

    summary = {"generated": 0, "skipped": []}

    with transaction.atomic():
        for employee in employees:
            salary_structure = getattr(employee, "salary_structure", None)
            if not salary_structure:
                summary["skipped"].append(
                    {
                        "employee_id": employee.id,
                        "reason": "Salary structure is missing.",
                    }
                )
                continue

            basic_salary = salary_structure.basic_salary
            daily_rate = _resolve_daily_rate(salary_structure)
            minute_rate = (daily_rate / MINUTES_PER_DAY) if daily_rate else None

            earnings_total = Decimal("0")
            deductions_total = Decimal("0")
            lines = []

            if salary_structure.salary_type != SalaryStructure.SalaryType.COMMISSION and basic_salary > 0:
                meta = {}
                if daily_rate is not None:
                    meta["rate"] = str(_quantize_amount(daily_rate))
                lines.append(
                    PayrollLine(
                        company=company,
                        payroll_run=None,
                        code="BASIC",
                        name="Basic Salary",
                        type=PayrollLine.LineType.EARNING,
                        amount=_quantize_amount(basic_salary),
                        meta=meta,
                    )
                )
                earnings_total += basic_salary
                
            components = salary_structure.components.filter(is_recurring=True)
            for component in components:
                line_type = (
                    PayrollLine.LineType.EARNING
                    if component.type == SalaryComponent.ComponentType.EARNING
                    else PayrollLine.LineType.DEDUCTION
                )
                amount = component.amount
                lines.append(
                    PayrollLine(
                        company=company,
                        payroll_run=None,
                        code=f"COMP-{component.id}",
                        name=component.name,
                        type=line_type,
                        amount=_quantize_amount(amount),
                        meta={"recurring": component.is_recurring},
                    )
                )
                if line_type == PayrollLine.LineType.EARNING:
                    earnings_total += amount
                else:
                    deductions_total += amount

            attendance_qs = AttendanceRecord.objects.filter(
                company=company,
                employee=employee,
                date__range=(start_date, end_date),
            )
            late_minutes_total = (
                attendance_qs.aggregate(total=Sum("late_minutes"))["total"] or 0
            )
            absent_days = attendance_qs.filter(
                status=AttendanceRecord.Status.ABSENT
            ).count()

            if late_minutes_total and minute_rate is not None:                
                late_amount = _quantize_amount(
                    minute_rate * Decimal(late_minutes_total)
                )
                if late_amount > 0:
                    lines.append(
                        PayrollLine(
                            company=company,
                            payroll_run=None,
                            code="LATE",
                            name="Late Minutes Deduction",
                            type=PayrollLine.LineType.DEDUCTION,
                            amount=late_amount,
                            meta={
                                "minutes": late_minutes_total,
                                "rate_per_minute": str(_quantize_amount(minute_rate)),
                            },
                        )
                    )
                    deductions_total += late_amount

            if absent_days and daily_rate is not None:                
                absent_amount = _quantize_amount(
                    daily_rate * Decimal(absent_days)
                )
                if absent_amount > 0:
                    lines.append(
                        PayrollLine(
                            company=company,
                            payroll_run=None,
                            code="ABSENT",
                            name="Absent Days Deduction",
                            type=PayrollLine.LineType.DEDUCTION,
                            amount=absent_amount,
                            meta={
                                "days": absent_days,
                                "rate": str(_quantize_amount(daily_rate)),
                            },
                        )
                    )
                    deductions_total += absent_amount

            unpaid_requests = LeaveRequest.objects.filter(
                company=company,
                employee=employee,
                status=LeaveRequest.Status.APPROVED,
                leave_type__paid=False,
                start_date__lte=end_date,
                end_date__gte=start_date,
            )
            unpaid_leave_days = Decimal("0")
            for request in unpaid_requests:
                unpaid_leave_days += _overlap_days(
                    request.start_date, request.end_date, start_date, end_date
                )

            if unpaid_leave_days and daily_rate is not None:
                unpaid_amount = _quantize_amount(daily_rate * unpaid_leave_days)
                if unpaid_amount > 0:
                    lines.append(
                        PayrollLine(
                            company=company,
                            payroll_run=None,
                            code="UNPAID_LEAVE",
                            name="Unpaid Leave Deduction",
                            type=PayrollLine.LineType.DEDUCTION,
                            amount=unpaid_amount,
                            meta={
                                "days": str(unpaid_leave_days),
                                "rate": str(_quantize_amount(daily_rate)),
                            },
                        )
                    )
                    deductions_total += unpaid_amount

            approved_commissions = CommissionRequest.objects.filter(
                company=company,
                employee=employee,
                status=CommissionRequest.Status.APPROVED,
                earned_date__range=(start_date, end_date),
            )
            for commission in approved_commissions:
                if commission.amount > 0:
                    lines.append(
                        PayrollLine(
                            company=company,
                            payroll_run=None,
                            code=f"COMM-{commission.id}",
                            name="Commission",
                            type=PayrollLine.LineType.EARNING,
                            amount=_quantize_amount(commission.amount),
                            meta={"earned_date": str(commission.earned_date)},
                        )
                    )
                    earnings_total += commission.amount
                    
            loans = LoanAdvance.objects.filter(
                company=company,
                employee=employee,
                status=LoanAdvance.Status.ACTIVE,
                remaining_amount__gt=0,
            )
            for loan in loans:
                installment = min(loan.installment_amount, loan.remaining_amount)
                installment_amount = _quantize_amount(installment)
                if installment_amount > 0:
                    lines.append(
                        PayrollLine(
                            company=company,
                            payroll_run=None,
                            code=f"LOAN-{loan.id}",
                            name=f"{loan.get_type_display()} installment",
                            type=PayrollLine.LineType.DEDUCTION,
                            amount=installment_amount,
                            meta={
                                "loan_id": loan.id,
                                "remaining_amount": str(loan.remaining_amount),
                            },
                        )
                    )
                    deductions_total += installment_amount

            earnings_total = _quantize_amount(earnings_total)
            deductions_total = _quantize_amount(deductions_total)
            net_total = _quantize_amount(earnings_total - deductions_total)

            run, _ = PayrollRun.objects.update_or_create(
                period=period,
                employee=employee,
                defaults={
                    "status": PayrollRun.Status.DRAFT,
                    "earnings_total": earnings_total,
                    "deductions_total": deductions_total,
                    "net_total": net_total,
                    "generated_at": timezone.now(),
                    "generated_by": actor,
                },
            )
            run.lines.all().delete()

            for line in lines:
                line.payroll_run = run
            PayrollLine.objects.bulk_create(lines)

            summary["generated"] += 1

    return summary