import json
import logging
from pathlib import Path

from django.core.exceptions import ValidationError
from django.db import transaction

from accounting.models import Account, AccountMapping, ChartOfAccounts
from accounting.services.seed import TEMPLATES, seed_coa_template

from core.models import CompanySetupState, Permission, Role, RolePermission
from core.permissions import PERMISSION_DEFINITIONS, ROLE_PERMISSION_MAP
from hr.models import PolicyRule, Shift, WorkSite


TEMPLATE_DIR = Path(__file__).resolve().parent.parent / "templates"
logger = logging.getLogger(__name__)

MAPPING_KEY_MAP = {
    "payroll_expense": AccountMapping.Key.PAYROLL_SALARIES_EXPENSE,
    "payroll_payable": AccountMapping.Key.PAYROLL_PAYABLE,
    "cash": AccountMapping.Key.EXPENSE_DEFAULT_CASH,
    "receivables": AccountMapping.Key.ACCOUNTS_RECEIVABLE,
    "sales": AccountMapping.Key.SALES_REVENUE,
}

FALLBACK_ACCOUNT_TYPES = {
    AccountMapping.Key.PAYROLL_SALARIES_EXPENSE: Account.Type.EXPENSE,
    AccountMapping.Key.PAYROLL_PAYABLE: Account.Type.LIABILITY,
    AccountMapping.Key.EXPENSE_DEFAULT_CASH: Account.Type.ASSET,
    AccountMapping.Key.EXPENSE_DEFAULT_AP: Account.Type.LIABILITY,
    AccountMapping.Key.ACCOUNTS_RECEIVABLE: Account.Type.ASSET,
    AccountMapping.Key.SALES_REVENUE: Account.Type.INCOME,
}

# ✅ Fallback bundle (لو JSON مش موجود)
# IMPORTANT: roles permissions هنا مجرد "marker" — الصلاحيات الحقيقية بتيجي من ROLE_PERMISSION_MAP
BUILTIN_TEMPLATE_BUNDLES = {
    "services_small": {
        "roles": [
            {"name": "Manager", "permissions": ["__AUTO__"]},
            {"name": "HR", "permissions": ["__AUTO__"]},
            {"name": "Accountant", "permissions": ["__AUTO__"]},
            {"name": "Employee", "permissions": ["expenses.create"]},
        ],
        "attendance": {
            "worksites": [
                {"name": "HQ", "lat": 30.0444, "lng": 31.2357, "radius_meters": 200}
            ],
            "shifts": [
                {
                    "name": "Day Shift",
                    "start_time": "09:00",
                    "end_time": "17:00",
                    "grace_minutes": 0,
                },
                {
                    "name": "Early Shift",
                    "start_time": "03:00",
                    "end_time": "11:00",
                    "grace_minutes": 0,
                }
            ],
        },
        "policies": {},
        "accounting": {},
    }
}


def load_template_bundle(code):
    path = TEMPLATE_DIR / f"{code}.json"
    if path.exists():
        with path.open(encoding="utf-8") as handle:
            return json.load(handle)

    builtin = BUILTIN_TEMPLATE_BUNDLES.get(code)
    if builtin:
        return builtin

    raise FileNotFoundError(f"Template bundle {code} not found.")


def build_template_overview(bundle):
    return {
        "roles": bundle.get("roles", []),
        "attendance": bundle.get("attendance", {}),
        "policies": bundle.get("policies", {}),
        "accounting": bundle.get("accounting", {}),
    }


def _permission_has_company_field() -> bool:
    return any(f.name == "company" for f in Permission._meta.fields)


def _ensure_permissions(company, permission_codes):
    permission_objects = {}
    has_company = _permission_has_company_field()

    for code in permission_codes:
        name = PERMISSION_DEFINITIONS.get(code, code)

        lookup = {"code": code}
        if has_company:
            lookup["company"] = company

        permission, _ = Permission.objects.get_or_create(
            **lookup,
            defaults={"name": name},
        )

        if getattr(permission, "name", None) != name:
            permission.name = name
            permission.save(update_fields=["name"])

        permission_objects[code] = permission

    return permission_objects


def apply_roles(company, roles_data):
    """Create/update the 4 core roles for the company and sync their permissions.

    Roles (inside company): Manager / HR / Accountant / Employee

    Notes:
    - Backward compatibility: لو template فيه roles زيادة، هننشئها برضه.
    - الـ4 core roles دايمًا موجودين.
    - Sync idempotent.
    """
    all_permission_codes = set(PERMISSION_DEFINITIONS.keys())

    def desired_codes_for_role(role_name: str, template_permissions: list[str] | None = None) -> set[str]:
        # 1) Prefer product-defined ROLE_PERMISSION_MAP
        map_codes = ROLE_PERMISSION_MAP.get(role_name)
        if map_codes:
            if "*" in map_codes:
                return set(all_permission_codes)
            return set(map_codes)

        # 2) Fallback: template permissions
        template_permissions = template_permissions or []
        if "*" in template_permissions:
            return set(all_permission_codes)
        if "__AUTO__" in template_permissions:
            # Safe default: Manager gets everything, the rest can be tuned from ROLE_PERMISSION_MAP anyway
            return set(all_permission_codes)
        return set(template_permissions)

    role_rows = list(roles_data or [])

    core_names = {"Manager", "HR", "Accountant", "Employee"}
    existing_names = {str(r.get("name", "")).strip() for r in role_rows if isinstance(r, dict)}
    for core in core_names:
        if core not in existing_names:
            role_rows.append({"name": core, "permissions": ["__AUTO__"]})

    needed_codes = set()
    for row in role_rows:
        name = (row.get("name") or "").strip()
        perms = row.get("permissions", [])
        needed_codes.update(desired_codes_for_role(name, perms))

    permission_objects = _ensure_permissions(company, needed_codes)

    for row in role_rows:
        role_name = (row.get("name") or "").strip()
        role, _ = Role.objects.get_or_create(company=company, name=role_name)

        desired_codes = desired_codes_for_role(role_name, row.get("permissions", []))
        desired_perms = [permission_objects[c] for c in desired_codes if c in permission_objects]

        RolePermission.objects.filter(role=role).exclude(permission__in=desired_perms).delete()

        existing_perm_ids = set(
            RolePermission.objects.filter(role=role).values_list("permission_id", flat=True)
        )
        to_create = [
            RolePermission(role=role, permission=p)
            for p in desired_perms
            if p.id not in existing_perm_ids
        ]
        if to_create:
            RolePermission.objects.bulk_create(to_create, ignore_conflicts=True)


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
                "start_time": shift["start_time"],  # string
                "end_time": shift["end_time"],      # string
                "grace_minutes": shift.get("grace_minutes", 0),
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


def _resolve_account_defaults(account_code, mapped_key, template_accounts, chart):
    template_account = template_accounts.get(account_code)
    if template_account:
        return {
            "name": template_account["name"],
            "type": template_account["type"],
            "chart": chart,
            "is_active": True,
        }
    fallback_type = FALLBACK_ACCOUNT_TYPES.get(mapped_key, Account.Type.ASSET)
    fallback_name = mapped_key.label if mapped_key else f"Account {account_code}"
    return {
        "name": fallback_name,
        "type": fallback_type,
        "chart": chart,
        "is_active": True,
    }


def _get_or_create_default_chart(company, template_name=None):
    chart_name = template_name or "Default Chart of Accounts"
    chart, _ = ChartOfAccounts.objects.get_or_create(
        company=company,
        is_default=True,
        defaults={"name": chart_name},
    )
    if chart.name != chart_name:
        chart.name = chart_name
        chart.save(update_fields=["name"])
    return chart


def apply_accounting(company, accounting_data):
    template_key = accounting_data.get("chart_of_accounts_template")
    template_accounts = {}
    chart = None
    if template_key:
        try:
            seed_coa_template(company=company, template_key=template_key)
        except ValueError:
            template_accounts = {}
        except Exception:  # noqa: BLE001
            logger.exception("Failed to seed chart of accounts template %s", template_key)
        template = TEMPLATES.get(template_key, {})
        template_accounts = {account["code"]: account for account in template.get("accounts", [])}
        chart = ChartOfAccounts.objects.filter(company=company, is_default=True).first()
        if not chart:
            chart = _get_or_create_default_chart(company, template.get("name"))

    mappings = accounting_data.get("mappings", {})
    if not mappings:
        return

    account_codes = {code for code in mappings.values() if code}
    accounts = Account.objects.filter(company=company, code__in=account_codes)
    accounts_by_code = {account.code: account for account in accounts}
    missing_codes = account_codes.difference(accounts_by_code.keys())
    if missing_codes:
        for code in missing_codes:
            account, _ = Account.objects.get_or_create(
                company=company,
                code=code,
                defaults=_resolve_account_defaults(code, None, template_accounts, chart),
            )
            accounts_by_code[code] = account

    for mapping_key, account_code in mappings.items():
        mapped_key = MAPPING_KEY_MAP.get(mapping_key)
        if not mapped_key or not account_code:
            continue

        account = accounts_by_code.get(account_code)
        required = mapped_key in AccountMapping.REQUIRED_KEYS

        if not account:
            account, _ = Account.objects.get_or_create(
                company=company,
                code=account_code,
                defaults=_resolve_account_defaults(account_code, mapped_key, template_accounts, chart),
            )
            accounts_by_code[account_code] = account

        try:
            AccountMapping.objects.update_or_create(
                company=company,
                key=mapped_key,
                defaults={"account": account, "required": required},
            )
        except ValidationError:
            logger.exception("Failed to apply account mapping %s for company %s.", mapped_key, company.id)


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
            try:
                apply_accounting(company, bundle["accounting"])
            except Exception:  # noqa: BLE001
                logger.exception("Failed to apply accounting template for company %s.", company.id)
            else:
                state.coa_applied = True
                update_fields.append("coa_applied")

    if update_fields:
        state.save(update_fields=update_fields + ["updated_at"])

    return state
