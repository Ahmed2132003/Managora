from accounting.models import Account, ChartOfAccounts, CostCenter

TEMPLATES = {
    "services_small": {
        "name": "Services Small COA",
        "accounts": [
            {"code": "1000", "name": "Cash", "type": Account.Type.ASSET},
            {"code": "1010", "name": "Bank", "type": Account.Type.ASSET},
            {"code": "1100", "name": "Accounts Receivable", "type": Account.Type.ASSET},
            {"code": "2000", "name": "Accounts Payable", "type": Account.Type.LIABILITY},
            {"code": "2100", "name": "Payroll Payable", "type": Account.Type.LIABILITY},
            {"code": "3000", "name": "Owner's Equity", "type": Account.Type.EQUITY},
            {"code": "4000", "name": "Revenue", "type": Account.Type.INCOME},
            {"code": "4100", "name": "Revenue - Services", "type": Account.Type.INCOME},
            {"code": "5000", "name": "Salaries Expense", "type": Account.Type.EXPENSE},
            {"code": "5100", "name": "Operating Expenses", "type": Account.Type.EXPENSE},
            {"code": "5200", "name": "Utilities Expense", "type": Account.Type.EXPENSE},
            {"code": "5300", "name": "Rent Expense", "type": Account.Type.EXPENSE},
        ],
        "cost_centers": [
            {"code": "CC-ADMIN", "name": "Admin"},
            {"code": "CC-SALES", "name": "Sales"},
            {"code": "CC-OPS", "name": "Operations"},
        ],
    },
    "trading_basic": {
        "name": "Trading Basic COA",
        "accounts": [
            {"code": "1000", "name": "Cash", "type": Account.Type.ASSET},
            {"code": "1010", "name": "Bank", "type": Account.Type.ASSET},
            {"code": "1100", "name": "Inventory", "type": Account.Type.ASSET},
            {"code": "1200", "name": "Accounts Receivable", "type": Account.Type.ASSET},
            {"code": "2000", "name": "Accounts Payable", "type": Account.Type.LIABILITY},
            {"code": "3000", "name": "Owner's Equity", "type": Account.Type.EQUITY},
            {"code": "4000", "name": "Sales Revenue", "type": Account.Type.INCOME},
            {"code": "5000", "name": "Cost of Goods Sold", "type": Account.Type.EXPENSE},
            {"code": "5100", "name": "Operating Expenses", "type": Account.Type.EXPENSE},
            {"code": "5200", "name": "Salaries Expense", "type": Account.Type.EXPENSE},
        ],
        "cost_centers": [
            {"code": "CC-ADMIN", "name": "Admin"},
            {"code": "CC-SALES", "name": "Sales"},
            {"code": "CC-WH", "name": "Warehouse"},
        ],
    },
    "retail_basic": {
        "name": "Retail Basic COA",
        "accounts": [
            {"code": "1000", "name": "Cash", "type": Account.Type.ASSET},
            {"code": "1010", "name": "Bank", "type": Account.Type.ASSET},
            {"code": "1200", "name": "Accounts Receivable", "type": Account.Type.ASSET},
            {"code": "2000", "name": "Accounts Payable", "type": Account.Type.LIABILITY},
            {"code": "2100", "name": "Payroll Payable", "type": Account.Type.LIABILITY},
            {"code": "3000", "name": "Owner's Equity", "type": Account.Type.EQUITY},
            {"code": "4000", "name": "Sales Revenue", "type": Account.Type.INCOME},
            {"code": "5000", "name": "Cost of Goods Sold", "type": Account.Type.EXPENSE},
            {"code": "5200", "name": "Salaries Expense", "type": Account.Type.EXPENSE},
            {"code": "5300", "name": "Rent Expense", "type": Account.Type.EXPENSE},
        ],
        "cost_centers": [
            {"code": "CC-STORE", "name": "Store"},
            {"code": "CC-ADMIN", "name": "Admin"},
        ],
    },
}

def seed_coa_template(company, template_key):
    if template_key not in TEMPLATES:
        raise ValueError("Invalid template key.")

    template = TEMPLATES[template_key]
    chart, _ = ChartOfAccounts.objects.get_or_create(
        company=company,
        is_default=True,
        defaults={"name": template["name"]},
    )
    if chart.name != template["name"]:
        chart.name = template["name"]
        chart.save(update_fields=["name"])

    created_accounts = 0
    for account_data in template["accounts"]:
        account, created = Account.objects.update_or_create(
            company=company,
            code=account_data["code"],
            defaults={
                "name": account_data["name"],
                "type": account_data["type"],
                "chart": chart,
                "is_active": True,
            },
        )
        if created:
            created_accounts += 1

    created_cost_centers = 0
    for center_data in template["cost_centers"]:
        _, created = CostCenter.objects.update_or_create(
            company=company,
            code=center_data["code"],
            defaults={
                "name": center_data["name"],
                "is_active": True,
            },
        )
        if created:
            created_cost_centers += 1

    return {
        "chart_id": chart.id,
        "accounts_created": created_accounts,
        "cost_centers_created": created_cost_centers,
        "template_key": template_key,
    }