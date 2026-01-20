from __future__ import annotations

from datetime import timedelta
from decimal import Decimal

from hr.models import AttendanceRecord, HRAction, PolicyRule


def create_hr_action_if_not_exists(
    *,
    rule: PolicyRule,
    employee_id: int,
    company_id: int,
    attendance_record: AttendanceRecord | None = None,
    period_start=None,
    period_end=None,
    reason: str,
) -> HRAction | None:
    action_type = rule.action_type
    value = rule.action_value if rule.action_value is not None else Decimal("0")
    if attendance_record:
        if HRAction.objects.filter(
            company_id=company_id,
            employee_id=employee_id,
            rule=rule,
            attendance_record=attendance_record,
        ).exists():
            return None
        return HRAction.objects.create(
            company_id=company_id,
            employee_id=employee_id,
            rule=rule,
            attendance_record=attendance_record,
            action_type=action_type,
            value=value,
            reason=reason,
        )

    if period_start and period_end:
        if HRAction.objects.filter(
            company_id=company_id,
            employee_id=employee_id,
            rule=rule,
            period_start=period_start,
            period_end=period_end,
        ).exists():
            return None
        return HRAction.objects.create(
            company_id=company_id,
            employee_id=employee_id,
            rule=rule,
            attendance_record=None,
            action_type=action_type,
            value=value,
            reason=reason,
            period_start=period_start,
            period_end=period_end,
        )
    return None


def apply_late_over_minutes_rule(
    rule: PolicyRule,
    attendance_record: AttendanceRecord,
) -> HRAction | None:
    if attendance_record.status != AttendanceRecord.Status.LATE:
        return None
    if attendance_record.late_minutes <= rule.threshold:
        return None
    reason = (
        f"Late by {attendance_record.late_minutes} minutes "
        f"(threshold {rule.threshold}) on {attendance_record.date}"
    )
    return create_hr_action_if_not_exists(
        rule=rule,
        employee_id=attendance_record.employee_id,
        company_id=attendance_record.company_id,
        attendance_record=attendance_record,
        reason=reason,
    )


def apply_late_count_over_period_rule(
    rule: PolicyRule,
    attendance_record: AttendanceRecord,
) -> HRAction | None:
    if attendance_record.status != AttendanceRecord.Status.LATE:
        return None
    if not rule.period_days:
        return None
    period_end = attendance_record.date
    period_start = period_end - timedelta(days=rule.period_days - 1)
    late_count = AttendanceRecord.objects.filter(
        company_id=attendance_record.company_id,
        employee_id=attendance_record.employee_id,
        status=AttendanceRecord.Status.LATE,
        date__range=(period_start, period_end),
    ).count()
    if late_count < rule.threshold:
        return None
    reason = (
        f"Late {late_count} times between {period_start} and {period_end} "
        f"(threshold {rule.threshold})"
    )
    return create_hr_action_if_not_exists(
        rule=rule,
        employee_id=attendance_record.employee_id,
        company_id=attendance_record.company_id,
        period_start=period_start,
        period_end=period_end,
        reason=reason,
    )


def apply_absent_count_over_period_rule(
    rule: PolicyRule,
    attendance_record: AttendanceRecord,
) -> HRAction | None:
    if attendance_record.status != AttendanceRecord.Status.ABSENT:
        return None
    if not rule.period_days:
        return None
    period_end = attendance_record.date
    period_start = period_end - timedelta(days=rule.period_days - 1)
    absent_count = AttendanceRecord.objects.filter(
        company_id=attendance_record.company_id,
        employee_id=attendance_record.employee_id,
        status=AttendanceRecord.Status.ABSENT,
        date__range=(period_start, period_end),
    ).count()
    if absent_count < rule.threshold:
        return None
    reason = (
        f"Absent {absent_count} times between {period_start} and {period_end} "
        f"(threshold {rule.threshold})"
    )
    return create_hr_action_if_not_exists(
        rule=rule,
        employee_id=attendance_record.employee_id,
        company_id=attendance_record.company_id,
        period_start=period_start,
        period_end=period_end,
        reason=reason,
    )


def evaluate_attendance_record(attendance_record: AttendanceRecord) -> None:
    if not attendance_record:
        return
    active_rules = PolicyRule.objects.filter(
        company_id=attendance_record.company_id,
        is_active=True,
    )
    for rule in active_rules:
        if rule.rule_type == PolicyRule.RuleType.LATE_OVER_MINUTES:
            apply_late_over_minutes_rule(rule, attendance_record)
        elif rule.rule_type == PolicyRule.RuleType.LATE_COUNT_OVER_PERIOD:
            apply_late_count_over_period_rule(rule, attendance_record)
        elif rule.rule_type == PolicyRule.RuleType.ABSENT_COUNT_OVER_PERIOD:
            apply_absent_count_over_period_rule(rule, attendance_record)