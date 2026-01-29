from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("hr", "0007_employee_shift"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AlterField(
            model_name="attendancerecord",
            name="method",
            field=models.CharField(
                choices=[
                    ("gps", "GPS"),
                    ("qr", "QR"),
                    ("manual", "Manual"),
                    ("email_otp", "Email OTP"),
                ],
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="attendancerecord",
            name="check_in_distance_meters",
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="attendancerecord",
            name="check_out_distance_meters",
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="attendancerecord",
            name="check_in_approval_status",
            field=models.CharField(
                blank=True,
                choices=[("pending", "Pending"), ("approved", "Approved"), ("rejected", "Rejected")],
                max_length=10,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="attendancerecord",
            name="check_out_approval_status",
            field=models.CharField(
                blank=True,
                choices=[("pending", "Pending"), ("approved", "Approved"), ("rejected", "Rejected")],
                max_length=10,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="attendancerecord",
            name="check_in_approved_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="attendancerecord",
            name="check_out_approved_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="attendancerecord",
            name="check_in_rejection_reason",
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="attendancerecord",
            name="check_out_rejection_reason",
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="attendancerecord",
            name="check_in_approved_by",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="attendance_checkin_approvals",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name="attendancerecord",
            name="check_out_approved_by",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="attendance_checkout_approvals",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.CreateModel(
            name="AttendanceOtpRequest",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("is_deleted", models.BooleanField(default=False)),
                ("deleted_at", models.DateTimeField(blank=True, null=True)),
                ("purpose", models.CharField(choices=[("checkin", "Check-in"), ("checkout", "Check-out")], max_length=10)),
                ("code_salt", models.CharField(max_length=64)),
                ("code_hash", models.CharField(max_length=64)),
                ("expires_at", models.DateTimeField()),
                ("used_at", models.DateTimeField(blank=True, null=True)),
                ("attempts", models.PositiveIntegerField(default=0)),
                ("max_attempts", models.PositiveIntegerField(default=5)),
                ("company", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="attendanceotprequests", to="core.company")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="attendance_otp_requests", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "indexes": [
                    models.Index(fields=["company", "user", "expires_at"], name="att_otp_company_user_idx"),
                ],
            },
        ),
    ]
