from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("analytics", "0001_initial"),        
        ("core", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="AlertRule",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("key", models.SlugField(max_length=100)),
                ("name", models.CharField(max_length=255)),
                ("is_active", models.BooleanField(default=True)),
                (
                    "severity",
                    models.CharField(
                        choices=[
                            ("low", "Low"),
                            ("medium", "Medium"),
                            ("high", "High"),
                        ],
                        max_length=16,
                    ),
                ),
                ("kpi_key", models.CharField(max_length=100)),
                (
                    "method",
                    models.CharField(
                        choices=[
                            ("threshold", "Threshold"),
                            ("rolling_avg", "Rolling Average"),
                            ("zscore", "Z-Score"),
                        ],
                        max_length=32,
                    ),
                ),
                ("params", models.JSONField(blank=True, default=dict)),
                ("cooldown_hours", models.PositiveIntegerField(default=24)),
                (
                    "company",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="alert_rules",
                        to="core.company",
                    ),
                ),
                (
                    "created_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="created_alert_rules",
                        to="core.user",
                    ),
                ),
            ],
            options={
                "constraints": [
                    models.UniqueConstraint(
                        fields=("company", "key"),
                        name="unique_alert_rule_per_company",
                    )
                ]
            },
        ),
        migrations.CreateModel(
            name="AlertEvent",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("event_date", models.DateField()),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("open", "Open"),
                            ("acknowledged", "Acknowledged"),
                            ("resolved", "Resolved"),
                        ],
                        default="open",
                        max_length=20,
                    ),
                ),
                ("title", models.CharField(max_length=255)),
                ("message", models.TextField()),
                ("evidence", models.JSONField(blank=True, default=dict)),
                ("recommended_actions", models.JSONField(blank=True, default=list)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "company",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="alert_events",
                        to="core.company",
                    ),
                ),
                (
                    "rule",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="events",
                        to="analytics.alertrule",
                    ),
                ),
            ],
            options={
                "indexes": [
                    models.Index(
                        fields=["company", "status", "-event_date"],
                        name="alert_event_company_status_date_idx",
                    )
                ]
            },
        ),
        migrations.CreateModel(
            name="AlertAck",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("acked_at", models.DateTimeField(auto_now_add=True)),
                ("note", models.TextField(blank=True)),
                (
                    "acked_by",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="alert_acknowledgements",
                        to="core.user",
                    ),
                ),
                (
                    "event",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="acknowledgements",
                        to="analytics.alertevent",
                    ),
                ),
            ],
        ),
    ]