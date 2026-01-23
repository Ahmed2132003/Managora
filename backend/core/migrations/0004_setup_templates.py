from django.db import migrations, models


def seed_setup_templates(apps, schema_editor):
    SetupTemplate = apps.get_model("core", "SetupTemplate")
    templates = [
        {
            "code": "services_small",
            "name_ar": "شركة خدمات صغيرة",
            "name_en": "Services Small",
            "description": "قالب جاهز لشركة خدمات مع أدوار وسياسات ومواعيد عمل أساسية.",
            "version": 1,
            "is_active": True,
        },
        {
            "code": "retail_basic",
            "name_ar": "تجارة تجزئة أساسية",
            "name_en": "Retail Basic",
            "description": "قالب مناسب لشركات التجزئة مع إعدادات حضور وحسابات افتراضية.",
            "version": 1,
            "is_active": True,
        },
    ]
    for template in templates:
        SetupTemplate.objects.update_or_create(code=template["code"], defaults=template)


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0003_auditlog"),
    ]

    operations = [
        migrations.CreateModel(
            name="SetupTemplate",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("code", models.CharField(max_length=100, unique=True)),
                ("name_ar", models.CharField(max_length=255)),
                ("name_en", models.CharField(max_length=255)),
                ("description", models.TextField(blank=True)),
                ("version", models.PositiveIntegerField(default=1)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
        ),
        migrations.CreateModel(
            name="TemplateApplyLog",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("template_code", models.CharField(max_length=100)),
                ("template_version", models.PositiveIntegerField()),
                ("status", models.CharField(choices=[("started", "Started"), ("succeeded", "Succeeded"), ("failed", "Failed")], max_length=20)),
                ("error", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("company", models.ForeignKey(on_delete=models.deletion.CASCADE, related_name="template_apply_logs", to="core.company")),
            ],
        ),
        migrations.CreateModel(
            name="CompanySetupState",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("roles_applied", models.BooleanField(default=False)),
                ("policies_applied", models.BooleanField(default=False)),
                ("shifts_applied", models.BooleanField(default=False)),
                ("coa_applied", models.BooleanField(default=False)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("company", models.OneToOneField(on_delete=models.deletion.CASCADE, related_name="setup_state", to="core.company")),
            ],
        ),
        migrations.AddIndex(
            model_name="templateapplylog",
            index=models.Index(fields=["company", "template_code", "template_version"], name="core_template_log_idx"),
        ),
        migrations.RunPython(seed_setup_templates, migrations.RunPython.noop),
    ]