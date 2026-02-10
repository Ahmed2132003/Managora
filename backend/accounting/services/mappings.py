from django.core.exceptions import ValidationError

from accounting.models import Account, AccountMapping, ChartOfAccounts


FALLBACK_MAPPING_METADATA = {
    AccountMapping.Key.ACCOUNTS_RECEIVABLE: {
        "codes": ["1100", "1200"],
        "names": ["Accounts Receivable"],
        "type": Account.Type.ASSET,
        "default_code": "AR",
    },
    AccountMapping.Key.SALES_REVENUE: {
        "codes": ["4000"],
        "names": ["Sales Revenue", "Revenue"],
        "type": Account.Type.INCOME,
        "default_code": "REV",
    },
    AccountMapping.Key.SALES_LIABILITY: {
        "codes": ["2200"],
        "names": ["Sales Liability", "Deferred Revenue"],
        "type": Account.Type.LIABILITY,
        "default_code": "SLIAB",
    },
    AccountMapping.Key.SALES_COGS_EXPENSE: {
        "codes": ["5100"],
        "names": ["Cost of Goods Sold", "COGS"],
        "type": Account.Type.EXPENSE,
        "default_code": "COGS",
    },
    AccountMapping.Key.PAYROLL_SALARIES_EXPENSE: {
        "codes": ["5000", "5200"],
        "names": ["Salaries Expense", "Payroll Salaries Expense"],
        "type": Account.Type.EXPENSE,
        "default_code": "PAYEXP",
    },
    AccountMapping.Key.PAYROLL_PAYABLE: {
        "codes": ["2100"],
        "names": ["Payroll Payable"],
        "type": Account.Type.LIABILITY,
        "default_code": "PAYABLE",
    },
    AccountMapping.Key.EXPENSE_DEFAULT_CASH: {
        "codes": ["1000"],
        "names": ["Cash"],
        "type": Account.Type.ASSET,
        "default_code": "CASH",
    },
    AccountMapping.Key.EXPENSE_DEFAULT_AP: {
        "codes": ["2000"],
        "names": ["Accounts Payable"],
        "type": Account.Type.LIABILITY,
        "default_code": "AP",
    },
}


def _get_or_create_default_chart(company):
    chart, _ = ChartOfAccounts.objects.get_or_create(
        company=company,
        is_default=True,
        defaults={"name": "Default Chart of Accounts"},
    )
    return chart


def _pick_available_code(company, metadata):
    for code in metadata.get("codes", []):
        if not Account.objects.filter(company=company, code=code).exists():
            return code
    base = metadata.get("default_code") or "ACC"
    code = base
    suffix = 1
    while Account.objects.filter(company=company, code=code).exists():
        code = f"{base}-{suffix}"
        suffix += 1
    return code


def ensure_mapping_account(company, key):
    mapping = (
        AccountMapping.objects.filter(company=company, key=key)
        .select_related("account")
        .first()
    )
    if mapping and mapping.account_id:
        return mapping.account

    metadata = FALLBACK_MAPPING_METADATA.get(key, {})
    account = None
    codes = metadata.get("codes", [])
    if codes:
        account = (
            Account.objects.filter(company=company, code__in=codes)
            .order_by("id")
            .first()
        )
    names = metadata.get("names", [])
    if not account and names:
        account = (
            Account.objects.filter(company=company, name__in=names)
            .order_by("id")
            .first()
        )

    if not account and metadata:
        chart = _get_or_create_default_chart(company)
        account = Account.objects.create(
            company=company,
            code=_pick_available_code(company, metadata),
            name=names[0] if names else key.label,
            type=metadata.get("type", Account.Type.ASSET),
            chart=chart,
            is_active=True,
        )

    if not account:
        raise ValidationError(f"Missing account mapping for {key}.")

    required = key in AccountMapping.REQUIRED_KEYS
    if mapping:
        mapping.account = account
        mapping.required = required
        mapping.save(update_fields=["account", "required", "updated_at"])
    else:
        AccountMapping.objects.create(
            company=company,
            key=key,
            account=account,
            required=required,
        )
    return account