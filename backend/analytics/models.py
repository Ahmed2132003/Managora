from django.db import models


class KPIDefinition(models.Model):
    class Category(models.TextChoices):
        FINANCE = "finance", "Finance"
        HR = "hr", "HR"
        OPS = "ops", "Operations"
        CASH = "cash", "Cash"

    class Unit(models.TextChoices):
        CURRENCY = "currency", "Currency"
        PERCENT = "percent", "Percent"
        COUNT = "count", "Count"
        HOURS = "hours", "Hours"

    company = models.ForeignKey(
        "core.Company",
        on_delete=models.CASCADE,
        related_name="kpi_definitions",
    )
    key = models.SlugField(max_length=100)
    name = models.CharField(max_length=255)
    category = models.CharField(max_length=20, choices=Category.choices)
    unit = models.CharField(max_length=20, choices=Unit.choices)
    description = models.TextField(blank=True)
    formula_hint = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["company", "key"],
                name="unique_kpi_definition_per_company",
            ),
        ]

    def __str__(self):
        return f"{self.company.name} - {self.key}"


class KPIFactDaily(models.Model):
    company = models.ForeignKey(
        "core.Company",
        on_delete=models.CASCADE,
        related_name="kpi_facts_daily",
    )
    date = models.DateField()
    kpi_key = models.CharField(max_length=100)
    value = models.DecimalField(max_digits=18, decimal_places=6)
    meta = models.JSONField(default=dict, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["company", "date", "kpi_key"],
                name="unique_kpi_fact_daily",
            ),
        ]
        indexes = [
            models.Index(fields=["company", "date"], name="kpi_fact_comp_date_idx"),
            models.Index(
                fields=["company", "kpi_key", "date"],
                name="kpi_fact_comp_key_date_idx",
            ),
        ]

    def __str__(self):
        return f"{self.company.name} - {self.kpi_key} - {self.date}"


class KPIContributionDaily(models.Model):
    company = models.ForeignKey(
        "core.Company",
        on_delete=models.CASCADE,
        related_name="kpi_contributions_daily",
    )
    date = models.DateField()
    kpi_key = models.CharField(max_length=100)
    dimension = models.CharField(max_length=100)
    dimension_id = models.CharField(max_length=100)
    amount = models.DecimalField(max_digits=18, decimal_places=6)
    meta = models.JSONField(default=dict, blank=True)

    class Meta:
        indexes = [
            models.Index(
                fields=["company", "date"],
                name="kpi_contrib_comp_date_idx",
            ),
            models.Index(
                fields=["company", "kpi_key", "date"],
                name="kpi_contrib_comp_key_date_idx",
            ),
        ]

    def __str__(self):
        return f"{self.company.name} - {self.kpi_key} - {self.date}"


class AnalyticsJobRun(models.Model):
    class Status(models.TextChoices):
        RUNNING = "running", "Running"
        SUCCESS = "success", "Success"
        FAILED = "failed", "Failed"

    company = models.ForeignKey(
        "core.Company",
        on_delete=models.CASCADE,
        related_name="analytics_job_runs",
    )
    job_key = models.CharField(max_length=100)
    period_start = models.DateField()
    period_end = models.DateField()
    status = models.CharField(max_length=20, choices=Status.choices)
    started_at = models.DateTimeField(auto_now_add=True)
    finished_at = models.DateTimeField(null=True, blank=True)
    error = models.TextField(null=True, blank=True)
    stats = models.JSONField(default=dict, blank=True)

    class Meta:
        indexes = [
            models.Index(
                fields=["company", "job_key", "period_start", "period_end"],
                name="analytics_job_run_idx",
            ),
        ]

    def __str__(self):
        return f"{self.company.name} - {self.job_key}"