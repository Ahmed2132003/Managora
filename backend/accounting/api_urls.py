from django.urls import include, path
from rest_framework.routers import DefaultRouter

from accounting.views import (
    AccountViewSet,
    AccountMappingViewSet,
    ApplyTemplateView,
    CostCenterViewSet,
    ExpenseViewSet,
    JournalEntryViewSet,
)

router = DefaultRouter()
router.register("accounting/accounts", AccountViewSet, basename="accounting-account")
router.register("accounting/mappings", AccountMappingViewSet, basename="accounting-mapping")
router.register("accounting/cost-centers", CostCenterViewSet, basename="cost-center")
router.register(
    "accounting/journal-entries", JournalEntryViewSet, basename="journal-entry"
)
router.register("expenses", ExpenseViewSet, basename="expense")

urlpatterns = [
    path("", include(router.urls)),
    path("accounting/coa/apply-template/", ApplyTemplateView.as_view(), name="coa-apply-template"),
]