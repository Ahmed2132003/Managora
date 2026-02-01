from calendar import monthrange
from datetime import date

from django.db import migrations, models


def populate_payroll_period_dates(apps, schema_editor):
    PayrollPeriod = apps.get_model("hr", "PayrollPeriod")
    for period in PayrollPeriod.objects.all():
        if period.start_date and period.end_date:
            continue
        if period.year and period.month:
            last_day = monthrange(period.year, period.month)[1]
            period.start_date = date(period.year, period.month, 1)
            period.end_date = date(period.year, period.month, last_day)
        if not period.period_type:
            period.period_type = "monthly"
        period.save(update_fields=["start_date", "end_date", "period_type"])


class Migration(migrations.Migration):
    dependencies = [
        ("hr", "0012_alter_commissionrequest_company"),
    ]

    operations = [
        migrations.AddField(
            model_name="payrollperiod",
            name="period_type",
            field=models.CharField(
                choices=[("monthly", "Monthly"), ("weekly", "Weekly"), ("daily", "Daily")],
                default="monthly",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="payrollperiod",
            name="start_date",
            field=models.DateField(null=True),
        ),
        migrations.AddField(
            model_name="payrollperiod",
            name="end_date",
            field=models.DateField(null=True),
        ),
        migrations.RemoveConstraint(
            model_name="payrollperiod",
            name="unique_payroll_period_per_company",
        ),
        migrations.RunPython(populate_payroll_period_dates, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="payrollperiod",
            name="start_date",
            field=models.DateField(),
        ),
        migrations.AlterField(
            model_name="payrollperiod",
            name="end_date",
            field=models.DateField(),
        ),
        migrations.AddConstraint(
            model_name="payrollperiod",
            constraint=models.UniqueConstraint(
                fields=("company", "period_type", "start_date", "end_date"),
                name="unique_payroll_period_per_company_range",
            ),
        ),
    ]