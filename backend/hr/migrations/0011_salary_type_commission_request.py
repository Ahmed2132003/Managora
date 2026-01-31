from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):
    dependencies = [
        ("hr", "0010_expand_attendance_coordinates"),
        ("core", "0009_companyemailconfig"),
    ]

    operations = [
        migrations.AddField(
            model_name="salarystructure",
            name="salary_type",
            field=models.CharField(
                choices=[
                    ("daily", "Daily"),
                    ("monthly", "Monthly"),
                    ("weekly", "Weekly / Part-time"),
                    ("commission", "Commission"),
                ],
                default="monthly",
                max_length=20,
            ),
        ),
        migrations.CreateModel(
            name="CommissionRequest",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("is_deleted", models.BooleanField(default=False)),
                ("deleted_at", models.DateTimeField(blank=True, null=True)),
                ("amount", models.DecimalField(decimal_places=2, max_digits=12)),
                ("earned_date", models.DateField()),
                ("note", models.TextField(blank=True, null=True)),
                ("status", models.CharField(choices=[("pending", "Pending"), ("approved", "Approved"), ("rejected", "Rejected")], default="pending", max_length=20)),
                ("requested_at", models.DateTimeField(default=django.utils.timezone.now)),
                ("decided_at", models.DateTimeField(blank=True, null=True)),
                ("reject_reason", models.TextField(blank=True, null=True)),
                ("company", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="commissionrequests", to="core.company")),
                ("decided_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="decided_commission_requests", to="core.user")),
                ("employee", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="commission_requests", to="hr.employee")),
            ],
            options={
                "indexes": [
                    models.Index(fields=["company", "status"], name="commission_comp_status_idx"),
                    models.Index(fields=["company", "employee"], name="commission_comp_emp_idx"),
                ],
            },
        ),
    ]