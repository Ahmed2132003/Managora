from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("accounting", "0004_expense_expenseattachment"),
        ("core", "0003_auditlog"),
    ]

    operations = [
        migrations.CreateModel(
            name="AccountMapping",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("key", models.CharField(choices=[("PAYROLL_SALARIES_EXPENSE", "Payroll Salaries Expense"), ("PAYROLL_PAYABLE", "Payroll Payable"), ("EXPENSE_DEFAULT_CASH", "Expense Default Cash"), ("EXPENSE_DEFAULT_AP", "Expense Default AP")], max_length=64)),
                ("required", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("account", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name="account_mappings", to="accounting.account")),
                ("company", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="account_mappings", to="core.company")),
            ],
            options={
                "constraints": [
                    models.UniqueConstraint(fields=("company", "key"), name="unique_account_mapping_per_company_key"),
                ],
            },
        ),
    ]