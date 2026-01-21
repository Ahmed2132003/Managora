from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0001_initial"),
        ("accounting", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="JournalEntry",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("date", models.DateField()),
                (
                    "reference_type",
                    models.CharField(
                        choices=[
                            ("manual", "Manual"),
                            ("payroll", "Payroll"),
                            ("expense", "Expense"),
                            ("adjustment", "Adjustment"),
                        ],
                        default="manual",
                        max_length=32,
                    ),
                ),
                ("reference_id", models.CharField(blank=True, max_length=64, null=True)),
                ("memo", models.TextField(blank=True)),
                (
                    "status",
                    models.CharField(
                        choices=[("draft", "Draft"), ("posted", "Posted")],
                        default="posted",
                        max_length=16,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "company",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="journal_entries",
                        to="core.company",
                    ),
                ),
                (
                    "created_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="journal_entries",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
        ),
        migrations.CreateModel(
            name="JournalLine",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("description", models.CharField(blank=True, max_length=255)),
                ("debit", models.DecimalField(decimal_places=2, default=0, max_digits=14)),
                ("credit", models.DecimalField(decimal_places=2, default=0, max_digits=14)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "account",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="journal_lines",
                        to="accounting.account",
                    ),
                ),
                (
                    "company",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="journal_lines",
                        to="core.company",
                    ),
                ),
                (
                    "cost_center",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="journal_lines",
                        to="accounting.costcenter",
                    ),
                ),
                (
                    "entry",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="lines",
                        to="accounting.journalentry",
                    ),
                ),
            ],
        ),
        migrations.AddConstraint(
            model_name="journalline",
            constraint=models.CheckConstraint(
                check=(
                    (models.Q(("credit", 0), ("debit__gt", 0))
                    | models.Q(("credit__gt", 0), ("debit", 0)))
                ),
                name="journal_line_single_sided_amount",
            ),
        ),
        migrations.AddIndex(
            model_name="journalentry",
            index=models.Index(fields=["company", "date"], name="accounting_company_2f9f35_idx"),
        ),
        migrations.AddIndex(
            model_name="journalentry",
            index=models.Index(
                fields=["company", "reference_type", "reference_id"],
                name="accounting_company_2451e7_idx",
            ),
        ),
    ]