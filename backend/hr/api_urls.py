from django.urls import include, path
from rest_framework.routers import DefaultRouter

from hr.views import (
    AttendanceCheckInView,
    AttendanceCheckOutView,
    AttendanceMyView,
    AttendanceRecordViewSet,
    AttendanceQrGenerateView,
    DepartmentViewSet,
    LeaveApprovalsInboxView,
    LeaveApproveView,
    LeaveBalanceMyView,
    LeaveBalanceViewSet,
    LeaveRejectView,
    LeaveRequestCancelView,
    LeaveRequestCreateView,
    LeaveRequestMyListView,
    LeaveTypeViewSet,
    HRActionViewSet,
    EmployeeDocumentDeleteView,
    EmployeeDocumentDownloadView,
    EmployeeDocumentListCreateView,
    EmployeeViewSet,          
    JobTitleViewSet,
    PayrollPeriodCreateView,
    PayrollPeriodGenerateView,
    PayrollPeriodLockView,
    PayrollPeriodRunsListView,
    PayrollRunDetailView,
    PayrollRunPayslipPDFView,
    PolicyRuleViewSet,
)

router = DefaultRouter()
router.register("departments", DepartmentViewSet, basename="department")
router.register("job-titles", JobTitleViewSet, basename="job-title")
router.register("employees", EmployeeViewSet, basename="employee")
router.register("leaves/types", LeaveTypeViewSet, basename="leave-type")
router.register("leaves/balances", LeaveBalanceViewSet, basename="leave-balance")
router.register(
    "attendance/records", AttendanceRecordViewSet, basename="attendance-record"
)
router.register("policies", PolicyRuleViewSet, basename="policy-rule")
router.register("actions", HRActionViewSet, basename="hr-action")

urlpatterns = [
    path("", include(router.urls)),
    path(
        "leaves/balances/my/",
        LeaveBalanceMyView.as_view(),
        name="leave-balance-my",
    ),
    path(
        "leaves/requests/my/",
        LeaveRequestMyListView.as_view(),
        name="leave-request-my",
    ),
    path(
        "leaves/requests/",
        LeaveRequestCreateView.as_view(),
        name="leave-request-create",
    ),
    path(
        "leaves/requests/<int:id>/cancel/",
        LeaveRequestCancelView.as_view(),
        name="leave-request-cancel",
    ),
    path(
        "leaves/approvals/inbox/",
        LeaveApprovalsInboxView.as_view(),
        name="leave-approvals-inbox",
    ),
    path(
        "leaves/requests/<int:id>/approve/",
        LeaveApproveView.as_view(),
        name="leave-request-approve",
    ),
    path(
        "leaves/requests/<int:id>/reject/",
        LeaveRejectView.as_view(),
        name="leave-request-reject",
    ),
    path(
        "employees/<int:employee_id>/documents/",
        EmployeeDocumentListCreateView.as_view(),
        name="employee-documents",        
    ),
    path(
        "documents/<int:pk>/download/",
        EmployeeDocumentDownloadView.as_view(),
        name="employee-document-download",
    ),
    path(
        "documents/<int:pk>/",
        EmployeeDocumentDeleteView.as_view(),
        name="employee-document-delete",
    ),
    path(
        "attendance/check-in/",
        AttendanceCheckInView.as_view(),
        name="attendance-check-in",
    ),
    path(
        "attendance/check-out/",
        AttendanceCheckOutView.as_view(),
        name="attendance-check-out",
    ),
    path(
        "attendance/my/",
        AttendanceMyView.as_view(),
        name="attendance-my",
    ),
    path(
        "attendance/qr/generate/",
        AttendanceQrGenerateView.as_view(),
        name="attendance-qr-generate",
    ),
    path(
        "payroll/periods/",
        PayrollPeriodCreateView.as_view(),
        name="payroll-period-create",
    ),
    path(
        "payroll/periods/<int:id>/generate/",
        PayrollPeriodGenerateView.as_view(),
        name="payroll-period-generate",
    ),
    path(
        "payroll/periods/<int:id>/runs/",
        PayrollPeriodRunsListView.as_view(),
        name="payroll-period-runs",
    ),
    path(
        "payroll/periods/<int:id>/lock/",
        PayrollPeriodLockView.as_view(),
        name="payroll-period-lock",
    ),
    path(
        "payroll/runs/<int:id>/",
        PayrollRunDetailView.as_view(),
        name="payroll-run-detail",
    ),
    path(
        "payroll/runs/<int:id>/payslip.pdf",
        PayrollRunPayslipPDFView.as_view(),
        name="payroll-run-payslip",
    ),
]