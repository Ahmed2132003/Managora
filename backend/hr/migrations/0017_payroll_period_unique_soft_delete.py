from django.db import migrations, models
from django.db.models import Q


class Migration(migrations.Migration):
    dependencies = [
        ("hr", "0016_alter_hraction_value_alter_payrollrun_status"),
    ]

    operations = [
        migrations.RemoveConstraint(
            model_name="payrollperiod",
            name="unique_payroll_period_per_company_range",
        ),
        migrations.AddConstraint(
            model_name="payrollperiod",
            constraint=models.UniqueConstraint(
                fields=("company", "period_type", "start_date", "end_date"),
                condition=Q(is_deleted=False),
                name="unique_payroll_period_per_company_range",
            ),
        ),
    ]