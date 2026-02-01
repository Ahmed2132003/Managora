from django.urls import include, path
from rest_framework.routers import DefaultRouter

from hr.views import (
    AttendanceCheckInView,
    AttendanceCheckOutView,
    AttendanceMyView,

    # 🔐 Email OTP Attendance
    AttendanceSelfRequestOtpView,
    AttendanceSelfVerifyOtpView,
    AttendanceEmailConfigView,
    AttendancePendingApprovalsView,
    AttendanceApproveRejectView,

    AttendanceRecordViewSet,
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
    CommissionApprovalsInboxView,
    CommissionApproveView,
    CommissionRejectView,
    CommissionRequestCreateView,
    CommissionRequestMyListView,
    HRActionViewSet,    
    EmployeeDocumentDeleteView,
    EmployeeDocumentDownloadView,
    EmployeeDocumentListCreateView,
    EmployeeDefaultsView,
    EmployeeSelectableUsersView,
    EmployeeViewSet,          
    JobTitleViewSet,
    PayrollPeriodCreateView,
    PayrollPeriodGenerateView,
    PayrollPeriodLockView,
    PayrollPeriodRunsListView,
    PayrollRunDetailView,
    PayrollRunMarkPaidView,
    PayrollRunPayslipPDFView,
    PolicyRuleViewSet,
    SalaryComponentViewSet,
    SalaryStructureViewSet,
    ShiftViewSet,
    LoanAdvanceViewSet,
)

router = DefaultRouter()
router.register("departments", DepartmentViewSet, basename="department")
router.register("job-titles", JobTitleViewSet, basename="job-title")
router.register("employees", EmployeeViewSet, basename="employee")
router.register("salary-structures", SalaryStructureViewSet, basename="salary-structure")
router.register("salary-components", SalaryComponentViewSet, basename="salary-component")
router.register("loan-advances", LoanAdvanceViewSet, basename="loan-advance")
router.register("shifts", ShiftViewSet, basename="shift")
router.register("leaves/types", LeaveTypeViewSet, basename="leave-type")
router.register("leaves/balances", LeaveBalanceViewSet, basename="leave-balance")
router.register("attendance/records", AttendanceRecordViewSet, basename="attendance-record")
router.register("policies", PolicyRuleViewSet, basename="policy-rule")
router.register("actions", HRActionViewSet, basename="hr-action")

urlpatterns = [
    # =========================
    # Employees (custom endpoints MUST be before router)
    # =========================
    path("employees/selectable-users/", EmployeeSelectableUsersView.as_view(), name="employee-selectable-users"),
    path("employees/defaults/", EmployeeDefaultsView.as_view(), name="employee-defaults"),

    path("employees/<int:employee_id>/documents/", EmployeeDocumentListCreateView.as_view(), name="employee-documents"),
    path("documents/<int:pk>/download/", EmployeeDocumentDownloadView.as_view(), name="employee-document-download"),
    path("documents/<int:pk>/", EmployeeDocumentDeleteView.as_view(), name="employee-document-delete"),

    # =========================
    # Leaves
    # =========================
    path("leaves/balances/my/", LeaveBalanceMyView.as_view(), name="leave-balance-my"),
    path("leaves/requests/my/", LeaveRequestMyListView.as_view(), name="leave-request-my"),
    path("leaves/requests/", LeaveRequestCreateView.as_view(), name="leave-request-create"),
    path("leaves/requests/<int:id>/cancel/", LeaveRequestCancelView.as_view(), name="leave-request-cancel"),
    path("leaves/approvals/inbox/", LeaveApprovalsInboxView.as_view(), name="leave-approvals-inbox"),
    path("leaves/requests/<int:id>/approve/", LeaveApproveView.as_view(), name="leave-request-approve"),
    path("leaves/requests/<int:id>/reject/", LeaveRejectView.as_view(), name="leave-request-reject"),

    # =========================
    # Commissions
    # =========================
    path("commissions/requests/my/", CommissionRequestMyListView.as_view(), name="commission-request-my"),
    path("commissions/requests/", CommissionRequestCreateView.as_view(), name="commission-request-create"),
    path("commissions/approvals/inbox/", CommissionApprovalsInboxView.as_view(), name="commission-approvals-inbox"),
    path("commissions/requests/<int:id>/approve/", CommissionApproveView.as_view(), name="commission-request-approve"),
    path("commissions/requests/<int:id>/reject/", CommissionRejectView.as_view(), name="commission-request-reject"),
    
    # =========================
    # Attendance (OLD)
    # =========================
    path("attendance/check-in/", AttendanceCheckInView.as_view(), name="attendance-check-in"),
    path("attendance/check-out/", AttendanceCheckOutView.as_view(), name="attendance-check-out"),
    path("attendance/my/", AttendanceMyView.as_view(), name="attendance-my"),

    # =========================
    # Attendance (NEW EMAIL OTP FLOW)
    # =========================
    path("attendance/self/request-otp/", AttendanceSelfRequestOtpView.as_view(), name="attendance-self-request-otp"),
    path("attendance/self/verify-otp/", AttendanceSelfVerifyOtpView.as_view(), name="attendance-self-verify-otp"),
    path("attendance/hr/email-config/", AttendanceEmailConfigView.as_view(), name="attendance-email-config"),
    path("attendance/hr/pending/", AttendancePendingApprovalsView.as_view(), name="attendance-pending"),
    path("attendance/hr/<int:record_id>/<str:action>/", AttendanceApproveRejectView.as_view(), name="attendance-approve-reject"),

    # =========================
    # Payroll
    # =========================
    path("payroll/periods/", PayrollPeriodCreateView.as_view(), name="payroll-period-create"),
    path("payroll/periods/<int:id>/generate/", PayrollPeriodGenerateView.as_view(), name="payroll-period-generate"),
    path("payroll/periods/<int:id>/runs/", PayrollPeriodRunsListView.as_view(), name="payroll-period-runs"),
    path("payroll/periods/<int:id>/lock/", PayrollPeriodLockView.as_view(), name="payroll-period-lock"),
    path("payroll/runs/<int:id>/", PayrollRunDetailView.as_view(), name="payroll-run-detail"),
    path("payroll/runs/<int:id>/mark-paid/", PayrollRunMarkPaidView.as_view(), name="payroll-run-mark-paid"),
    path("payroll/runs/<int:id>/payslip.pdf", PayrollRunPayslipPDFView.as_view(), name="payroll-run-payslip"),

    # ✅ Router URLs MUST be last
    path("", include(router.urls)),
]
