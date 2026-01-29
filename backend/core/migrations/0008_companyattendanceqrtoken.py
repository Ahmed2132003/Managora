
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("hr", "0007_employee_shift"),
        ("core", "0007_company_attendance_qr_end_time_and_more"),
    ]

    operations = [
        migrations.CreateModel(
            name="CompanyAttendanceQrToken",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("issued_for", models.DateField()),
                ("token", models.TextField(unique=True)),
                ("valid_from", models.DateTimeField()),
                ("valid_until", models.DateTimeField()),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("company", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="attendance_qr_tokens", to="core.company")),
                ("worksite", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="attendance_qr_tokens", to="hr.worksite")),
            ],
            options={
                "indexes": [models.Index(fields=["company", "issued_for"], name="comp_qr_day_idx")],
            },
        ),
        migrations.AddConstraint(
            model_name="companyattendanceqrtoken",
            constraint=models.UniqueConstraint(fields=("company", "issued_for"), name="unique_company_qr_token_per_day"),
        ),
    ]
