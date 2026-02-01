from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("hr", "0013_payroll_period_type_and_dates"),
    ]

    operations = [
        migrations.RunSQL(
            sql=(
                "ALTER TABLE hr_payrollperiod "
                "ADD COLUMN IF NOT EXISTS period_type varchar(20) "
                "NOT NULL DEFAULT 'monthly';"
            ),
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]