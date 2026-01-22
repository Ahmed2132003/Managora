from django.urls import path

from analytics.views import AnalyticsRebuildView, KPIFactDailyListView

urlpatterns = [
    path("analytics/kpis/", KPIFactDailyListView.as_view(), name="analytics-kpi-facts"),
    path(
        "analytics/rebuild/",
        AnalyticsRebuildView.as_view(),
        name="analytics-rebuild",
    ),
]