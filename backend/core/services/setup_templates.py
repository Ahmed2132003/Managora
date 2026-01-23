import json
from pathlib import Path

from django.db import transaction
from django.utils.dateparse import parse_time

from accounting.models import Account, AccountMapping
from accounting.services.seed import seed_coa_template
from core.models import CompanySetupState, Permission, Role, RolePermission
from core.permissions import PERMISSION_DEFINITIONS
from hr.models import PolicyRule, Shift, WorkSite


TEMPLATE_DIR = Path(__file__).resolve().parent.parent / "templates"

MAPPING_KEY_MAP = {
    "payroll_expense": AccountMapping.Key.PAYROLL_SALARIES_EXPENSE,
    "payroll_payable": AccountMapping.Key.PAYROLL_PAYABLE,
    "cash": AccountMapping.Key.EXPENSE_DEFAULT_CASH,
    "receivables": AccountMapping.Key.ACCOUNTS_RECEIVABLE,
    "sales": AccountMapping.Key.SALES_REVENUE,
}


def load_template_bundle(code):
    path = TEMPLATE_DIR / f"{code}.json"
    if not path.exists():
        raise FileNotFoundError(f"Template bundle {code} not found.")
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def build_template_overview(bundle):
    return {
        "roles": bundle.get("roles", []),
        "attendance": bundle.get("attendance", {}),
        "policies": bundle.get("policies", {}),
        "accounting": bundle.get("accounting", {}),
    }


def _ensure_permissions(permission_codes):
    permission_objects = {}
    for code in permission_codes:
        name = PERMISSION_DEFINITIONS.get(code, code)
        permission, _ = Permission.objects.get_or_create(code=code, defaults={"name": name})
        if permission.name != name:
            permission.name = name
            permission.save(update_fields=["name"])
        permission_objects[code] = permission
    return permission_objects


def apply_roles(company, roles_data):
    all_permission_codes = set(PERMISSION_DEFINITIONS.keys())
    template_codes = set()
    for role in roles_data:
        permissions = role.get("permissions", [])
        if "*" in permissions:
            template_codes.update(all_permission_codes)
        else:
            template_codes.update(permissions)
    permission_objects = _ensure_permissions(template_codes)

    for role_data in roles_data:
        role, _ = Role.objects.get_or_create(
            company=company,
            name=role_data["name"],
        )
        requested_permissions = role_data.get("permissions", [])
        if "*" in requested_permissions:
            requested_permissions = list(all_permission_codes)
        for code in requested_permissions:
            permission = permission_objects.get(code)
            if permission:
                RolePermission.objects.get_or_create(role=role, permission=permission)


def apply_attendance(company, attendance_data):
    for worksite in attendance_data.get("worksites", []):
        WorkSite.objects.update_or_create(
            company=company,
            name=worksite["name"],
            defaults={
                "lat": worksite["lat"],
                "lng": worksite["lng"],
                "radius_meters": worksite["radius_meters"],
                "is_active": True,
            },
        )
    for shift in attendance_data.get("shifts", []):
        Shift.objects.update_or_create(
            company=company,
            name=shift["name"],
            defaults={
                "start_time": parse_time(shift["start_time"]),
                "end_time": parse_time(shift["end_time"]),
                "grace_minutes": shift["grace_minutes"],
                "is_active": True,
            },
        )


def _map_policy_rule(rule):
    rule_type = rule.get("type")
    if rule_type == "late_deduction":
        return {
            "name": "Late deduction",
            "rule_type": PolicyRule.RuleType.LATE_OVER_MINUTES,
            "threshold": rule.get("threshold_minutes", 0),
            "period_days": None,
            "action_type": PolicyRule.ActionType.DEDUCTION,
            "action_value": rule.get("amount"),
        }
    if rule_type == "absence_deduction":
        return {
            "name": "Absence deduction",
            "rule_type": PolicyRule.RuleType.ABSENT_COUNT_OVER_PERIOD,
            "threshold": 1,
            "period_days": 1,
            "action_type": PolicyRule.ActionType.DEDUCTION,
            "action_value": rule.get("amount_per_day"),
        }
    if rule_type in PolicyRule.RuleType.values:
        return {
            "name": rule.get("name", rule_type.replace("_", " ").title()),
            "rule_type": rule_type,
            "threshold": rule.get("threshold", 0),
            "period_days": rule.get("period_days"),
            "action_type": rule.get("action_type", PolicyRule.ActionType.WARNING),
            "action_value": rule.get("action_value"),
        }
    raise ValueError(f"Unsupported policy rule type: {rule_type}")


def apply_policies(company, policies_data):
    for rule in policies_data.get("rules", []):
        mapped = _map_policy_rule(rule)
        PolicyRule.objects.update_or_create(
            company=company,
            name=mapped["name"],
            defaults={
                "rule_type": mapped["rule_type"],
                "threshold": mapped["threshold"],
                "period_days": mapped["period_days"],
                "action_type": mapped["action_type"],
                "action_value": mapped["action_value"],
                "is_active": True,
            },
        )


def apply_accounting(company, accounting_data):
    template_key = accounting_data.get("chart_of_accounts_template")
    if template_key:
        seed_coa_template(company=company, template_key=template_key)

    mappings = accounting_data.get("mappings", {})
    if not mappings:
        return

    account_codes = set(mappings.values())
    accounts = Account.objects.filter(company=company, code__in=account_codes)
    accounts_by_code = {account.code: account for account in accounts}

    for mapping_key, account_code in mappings.items():
        mapped_key = MAPPING_KEY_MAP.get(mapping_key)
        if not mapped_key:
            continue
        account = accounts_by_code.get(account_code)
        required = mapped_key in AccountMapping.REQUIRED_KEYS
        if required and not account:
            raise ValueError(f"Required mapping {mapped_key} missing account {account_code}.")
        AccountMapping.objects.update_or_create(
            company=company,
            key=mapped_key,
            defaults={"account": account, "required": required},
        )


def apply_template_bundle(company, bundle):
    state, _ = CompanySetupState.objects.get_or_create(company=company)
    update_fields = []

    with transaction.atomic():
        if bundle.get("roles"):
            apply_roles(company, bundle["roles"])
            state.roles_applied = True
            update_fields.append("roles_applied")
        if bundle.get("attendance"):
            apply_attendance(company, bundle["attendance"])
            state.shifts_applied = True
            update_fields.append("shifts_applied")
        if bundle.get("policies"):
            apply_policies(company, bundle["policies"])
            state.policies_applied = True
            update_fields.append("policies_applied")
        if bundle.get("accounting"):
            apply_accounting(company, bundle["accounting"])
            state.coa_applied = True
            update_fields.append("coa_applied")

    if update_fields:
        state.save(update_fields=update_fields + ["updated_at"])

    return state