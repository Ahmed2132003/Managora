from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion

import hr.models


class Migration(migrations.Migration):
    dependencies = [
        ("hr", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="EmployeeDocument",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("is_deleted", models.BooleanField(default=False)),
                ("deleted_at", models.DateTimeField(blank=True, null=True)),
                ("doc_type", models.CharField(choices=[("contract", "Contract"), ("id", "ID"), ("other", "Other")], max_length=20)),
                ("title", models.CharField(blank=True, max_length=255)),
                ("file", models.FileField(upload_to=hr.models.employee_document_upload_to)),
                ("company", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="employeedocuments", to="core.company")),
                ("employee", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="documents", to="hr.employee")),
                ("uploaded_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="uploaded_employee_documents", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "abstract": False,
            },
        ),
    ]