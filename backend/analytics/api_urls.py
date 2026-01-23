from django.urls import path

from analytics.api import (
    AnalyticsBreakdownView,
    AnalyticsCompareView,
    AnalyticsExportView,
    AnalyticsKPIView,
    AnalyticsSummaryView,
)
from analytics.views import (
    AlertEventAcknowledgeView,
    AlertEventDetailView,
    AlertEventListView,
    AlertEventResolveView,
    AnalyticsRebuildView,
    KPIFactDailyListView,
)

urlpatterns = [
    path("analytics/summary/", AnalyticsSummaryView.as_view(), name="analytics-summary"),
    path("analytics/kpis/", AnalyticsKPIView.as_view(), name="analytics-kpis"),
    path("analytics/compare/", AnalyticsCompareView.as_view(), name="analytics-compare"),
    path(
        "analytics/breakdown/",
        AnalyticsBreakdownView.as_view(),
        name="analytics-breakdown",
    ),
    path("analytics/export/", AnalyticsExportView.as_view(), name="analytics-export"),
    path("analytics/kpi-facts/", KPIFactDailyListView.as_view(), name="analytics-kpi-facts"),
    path(
        "analytics/rebuild/",
        AnalyticsRebuildView.as_view(),
        name="analytics-rebuild",
    ),
    path("analytics/alerts/", AlertEventListView.as_view(), name="analytics-alerts"),
    path(
        "analytics/alerts/<int:pk>/",
        AlertEventDetailView.as_view(),
        name="analytics-alert-detail",
    ),
    path(
        "analytics/alerts/<int:pk>/ack/",
        AlertEventAcknowledgeView.as_view(),
        name="analytics-alert-ack",
    ),
    path(
        "analytics/alerts/<int:pk>/resolve/",
        AlertEventResolveView.as_view(),
        name="analytics-alert-resolve",
    ),
]