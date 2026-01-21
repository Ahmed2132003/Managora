from django.urls import include, path
from rest_framework.routers import DefaultRouter

from accounting.views import (
    AccountViewSet,
    ApplyTemplateView,
    CostCenterViewSet,
    JournalEntryViewSet,
)

router = DefaultRouter()
router.register("accounting/accounts", AccountViewSet, basename="accounting-account")
router.register("accounting/cost-centers", CostCenterViewSet, basename="cost-center")
router.register(
    "accounting/journal-entries", JournalEntryViewSet, basename="journal-entry"
)

urlpatterns = [
    path("", include(router.urls)),
    path("accounting/coa/apply-template/", ApplyTemplateView.as_view(), name="coa-apply-template"),
]