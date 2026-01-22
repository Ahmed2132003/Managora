from django.contrib import admin

from analytics.models import (
    AnalyticsJobRun,
    KPIContributionDaily,
    KPIDefinition,
    KPIFactDaily,
)


@admin.register(KPIDefinition)
class KPIDefinitionAdmin(admin.ModelAdmin):
    list_display = ("company", "key", "name", "category", "unit", "is_active")
    list_filter = ("category", "unit", "is_active")
    search_fields = ("key", "name")


@admin.register(KPIFactDaily)
class KPIFactDailyAdmin(admin.ModelAdmin):
    list_display = ("company", "kpi_key", "date", "value")
    list_filter = ("kpi_key", "date")
    search_fields = ("kpi_key",)


@admin.register(KPIContributionDaily)
class KPIContributionDailyAdmin(admin.ModelAdmin):
    list_display = ("company", "kpi_key", "date", "dimension", "amount")
    list_filter = ("kpi_key", "dimension", "date")
    search_fields = ("dimension_id",)


@admin.register(AnalyticsJobRun)
class AnalyticsJobRunAdmin(admin.ModelAdmin):
    list_display = ("company", "job_key", "status", "period_start", "period_end")
    list_filter = ("job_key", "status")