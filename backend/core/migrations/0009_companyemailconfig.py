from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0008_companyattendanceqrtoken"),
    ]

    operations = [
        migrations.CreateModel(
            name="CompanyEmailConfig",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("sender_email", models.EmailField(max_length=254)),
                ("app_password_encrypted", models.BinaryField()),
                ("is_active", models.BooleanField(default=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "company",
                    models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="attendance_email_config", to="core.company"),
                ),
            ],
        ),
    ]
