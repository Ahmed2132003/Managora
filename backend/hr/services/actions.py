from __future__ import annotations

from hr.models import HRAction, PayrollPeriod, SalaryComponent, SalaryStructure


def _get_salary_structure(action: HRAction) -> SalaryStructure | None:
    return SalaryStructure.objects.filter(
        company_id=action.company_id,
        employee_id=action.employee_id,
    ).first()


def _get_payroll_period(
    *,
    action: HRAction,
    salary_structure: SalaryStructure,
) -> PayrollPeriod | None:
    if not action.period_start or not action.period_end:
        return None
    expected_period_type = (
        PayrollPeriod.PeriodType.MONTHLY
        if salary_structure.salary_type == SalaryStructure.SalaryType.COMMISSION
        else salary_structure.salary_type
    )
    return PayrollPeriod.objects.filter(
        company_id=action.company_id,
        period_type=expected_period_type,
        start_date=action.period_start,
        end_date=action.period_end,
    ).first()


def sync_hr_action_deduction_component(action: HRAction) -> None:
    component_name = f"HR action deduction: {action.rule.name} (#{action.id})"
    salary_structure = _get_salary_structure(action)
    if not salary_structure:
        return
    components_qs = SalaryComponent.objects.filter(
        company_id=action.company_id,
        salary_structure=salary_structure,
        name=component_name,
    )
    if action.action_type != HRAction.ActionType.DEDUCTION or action.value <= 0:
        components_qs.delete()
        return
    period = _get_payroll_period(action=action, salary_structure=salary_structure)
    if not period:
        components_qs.delete()
        return
    components_qs.update_or_create(
        defaults={
            "payroll_period": period,
            "type": SalaryComponent.ComponentType.DEDUCTION,
            "amount": action.value,
            "is_recurring": False,
        }
    )


def remove_hr_action_deduction_component(action: HRAction) -> None:
    salary_structure = _get_salary_structure(action)
    if not salary_structure:
        return
    SalaryComponent.objects.filter(
        company_id=action.company_id,
        salary_structure=salary_structure,
        name=f"HR action deduction: {action.rule.name} (#{action.id})",
    ).delete()