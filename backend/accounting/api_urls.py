from django.urls import include, path
from rest_framework.routers import DefaultRouter

from accounting.views import (
    AccountViewSet,
    AccountMappingViewSet,
    ApplyTemplateView,
    BalanceSheetView,
    CostCenterViewSet,
    CustomerViewSet,
    ExpenseViewSet,
    GeneralLedgerView,
    InvoiceViewSet,
    JournalEntryViewSet,    
    PaymentViewSet,
    ProfitLossView,
    TrialBalanceView,
)

router = DefaultRouter()
router.register("accounting/accounts", AccountViewSet, basename="accounting-account")
router.register("accounting/mappings", AccountMappingViewSet, basename="accounting-mapping")
router.register("accounting/cost-centers", CostCenterViewSet, basename="cost-center")
router.register("customers", CustomerViewSet, basename="customer")
router.register("invoices", InvoiceViewSet, basename="invoice")
router.register(
    "accounting/journal-entries", JournalEntryViewSet, basename="journal-entry"
)
router.register("expenses", ExpenseViewSet, basename="expense")
router.register("payments", PaymentViewSet, basename="payment")

urlpatterns = [
    path("", include(router.urls)),
    path("accounting/coa/apply-template/", ApplyTemplateView.as_view(), name="coa-apply-template"),
    path("reports/trial-balance/", TrialBalanceView.as_view(), name="report-trial-balance"),
    path("reports/general-ledger/", GeneralLedgerView.as_view(), name="report-general-ledger"),
    path("reports/pnl/", ProfitLossView.as_view(), name="report-pnl"),
    path("reports/balance-sheet/", BalanceSheetView.as_view(), name="report-balance-sheet"),
]