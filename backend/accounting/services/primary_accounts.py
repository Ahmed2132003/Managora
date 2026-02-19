from accounting.models import Account, ChartOfAccounts

PRIMARY_ACCOUNT_DEFINITIONS = {
    Account.Type.INCOME: {"code": "4000", "name": "Primary Revenue"},
    Account.Type.EXPENSE: {"code": "5000", "name": "Primary Expense"},
}


def _default_chart(company):
    chart, _ = ChartOfAccounts.objects.get_or_create(
        company=company,
        is_default=True,
        defaults={"name": "Default Chart of Accounts"},
    )
    return chart


def get_or_create_primary_account(company, account_type: str):
    if account_type not in PRIMARY_ACCOUNT_DEFINITIONS:
        raise ValueError("Unsupported primary account type.")

    metadata = PRIMARY_ACCOUNT_DEFINITIONS[account_type]
    account = (
        Account.objects.filter(
            company=company,
            type=account_type,
            name=metadata["name"],
        )
        .order_by("id")
        .first()
    )
    if account:
        return account

    account = (
        Account.objects.filter(
            company=company,
            type=account_type,
        )
        .order_by("id")
        .first()
    )
    if account:
        if account.name != metadata["name"]:
            account.name = metadata["name"]
            account.save(update_fields=["name", "updated_at"])
        return account

    chart = _default_chart(company)
    code = metadata["code"]
    if Account.objects.filter(company=company, code=code).exists():
        code = f"{code}-{account_type.lower()}"

    return Account.objects.create(
        company=company,
        chart=chart,
        code=code,
        name=metadata["name"],
        type=account_type,
        is_active=True,
    )


def get_primary_income_and_expense_accounts(company):
    income = get_or_create_primary_account(company, Account.Type.INCOME)
    expense = get_or_create_primary_account(company, Account.Type.EXPENSE)
    return income, expense