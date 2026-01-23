from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0003_auditlog"),
        ("analytics", "0005_rename_alert_event_company_status_date_idx_alert_event_company"),
    ]

    operations = [
        migrations.CreateModel(
            name="CashForecastSnapshot",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("as_of_date", models.DateField()),
                ("horizon_days", models.PositiveSmallIntegerField()),
                ("expected_inflows", models.DecimalField(decimal_places=2, max_digits=14)),
                ("expected_outflows", models.DecimalField(decimal_places=2, max_digits=14)),
                ("net_expected", models.DecimalField(decimal_places=2, max_digits=14)),
                ("details", models.JSONField(blank=True, default=dict)),
                (
                    "company",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="cash_forecast_snapshots",
                        to="core.company",
                    ),
                ),
            ],
        ),
        migrations.AddConstraint(
            model_name="cashforecastsnapshot",
            constraint=models.UniqueConstraint(
                fields=("company", "as_of_date", "horizon_days"),
                name="unique_cash_forecast_snapshot",
            ),
        ),
        migrations.AddIndex(
            model_name="cashforecastsnapshot",
            index=models.Index(
                fields=["company", "as_of_date"],
                name="cash_forecast_company_date_idx",
            ),
        ),
    ]