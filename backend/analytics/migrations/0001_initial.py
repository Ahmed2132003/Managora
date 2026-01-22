
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ("core", "0002_permission_alter_user_managers_role_rolepermission_and_more"),
    ]

    operations = [
        migrations.CreateModel(
            name="AnalyticsJobRun",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("job_key", models.CharField(max_length=100)),
                ("period_start", models.DateField()),
                ("period_end", models.DateField()),
                (
                    "status",
                    models.CharField(
                        choices=[("running", "Running"), ("success", "Success"), ("failed", "Failed")],
                        max_length=20,
                    ),
                ),
                ("started_at", models.DateTimeField(auto_now_add=True)),
                ("finished_at", models.DateTimeField(blank=True, null=True)),
                ("error", models.TextField(blank=True, null=True)),
                ("stats", models.JSONField(blank=True, default=dict)),
                (
                    "company",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="analytics_job_runs",
                        to="core.company",
                    ),
                ),
            ],
            options={
                "indexes": [
                    models.Index(
                        fields=["company", "job_key", "period_start", "period_end"],
                        name="analytics_job_run_idx",
                    ),
                ],
            },
        ),
        migrations.CreateModel(
            name="KPIContributionDaily",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("date", models.DateField()),
                ("kpi_key", models.CharField(max_length=100)),
                ("dimension", models.CharField(max_length=100)),
                ("dimension_id", models.CharField(max_length=100)),
                ("amount", models.DecimalField(decimal_places=6, max_digits=18)),
                ("meta", models.JSONField(blank=True, default=dict)),
                (
                    "company",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="kpi_contributions_daily",
                        to="core.company",
                    ),
                ),
            ],
            options={
                "indexes": [
                    models.Index(
                        fields=["company", "date"],
                        name="kpi_contrib_comp_date_idx",
                    ),
                    models.Index(
                        fields=["company", "kpi_key", "date"],
                        name="kpi_contrib_comp_key_date_idx",
                    ),
                ],
            },
        ),
        migrations.CreateModel(
            name="KPIDefinition",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("key", models.SlugField(max_length=100)),
                ("name", models.CharField(max_length=255)),
                (
                    "category",
                    models.CharField(
                        choices=[
                            ("finance", "Finance"),
                            ("hr", "HR"),
                            ("ops", "Operations"),
                            ("cash", "Cash"),
                        ],
                        max_length=20,
                    ),
                ),
                (
                    "unit",
                    models.CharField(
                        choices=[
                            ("currency", "Currency"),
                            ("percent", "Percent"),
                            ("count", "Count"),
                            ("hours", "Hours"),
                        ],
                        max_length=20,
                    ),
                ),
                ("description", models.TextField(blank=True)),
                ("formula_hint", models.TextField(blank=True)),
                ("is_active", models.BooleanField(default=True)),
                (
                    "company",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="kpi_definitions",
                        to="core.company",
                    ),
                ),
            ],
            options={
                "constraints": [
                    models.UniqueConstraint(
                        fields=("company", "key"),
                        name="unique_kpi_definition_per_company",
                    ),
                ],
            },
        ),
        migrations.CreateModel(
            name="KPIFactDaily",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("date", models.DateField()),
                ("kpi_key", models.CharField(max_length=100)),
                ("value", models.DecimalField(decimal_places=6, max_digits=18)),
                ("meta", models.JSONField(blank=True, default=dict)),
                (
                    "company",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="kpi_facts_daily",
                        to="core.company",
                    ),
                ),
            ],
            options={
                "indexes": [
                    models.Index(
                        fields=["company", "date"],
                        name="kpi_fact_comp_date_idx",
                    ),
                    models.Index(
                        fields=["company", "kpi_key", "date"],
                        name="kpi_fact_comp_key_date_idx",
                    ),
                ],
                "constraints": [
                    models.UniqueConstraint(
                        fields=("company", "date", "kpi_key"),
                        name="unique_kpi_fact_daily",
                    ),
                ],
            },
        ),
    ]