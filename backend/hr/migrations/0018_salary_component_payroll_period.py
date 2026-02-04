from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("hr", "0017_payroll_period_unique_soft_delete"),
    ]

    operations = [
        migrations.AddField(
            model_name="salarycomponent",
            name="payroll_period",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="salary_components",
                to="hr.payrollperiod",
            ),
        ),
    ]