from django.urls import include, path
from rest_framework.routers import DefaultRouter

from hr.views import (
    AttendanceCheckInView,
    AttendanceCheckOutView,
    AttendanceMyView,
    AttendanceRecordViewSet,
    DepartmentViewSet,
    EmployeeDocumentDeleteView,
    EmployeeDocumentDownloadView,
    EmployeeDocumentListCreateView,
    EmployeeViewSet,    
    JobTitleViewSet,
)

router = DefaultRouter()
router.register("departments", DepartmentViewSet, basename="department")
router.register("job-titles", JobTitleViewSet, basename="job-title")
router.register("employees", EmployeeViewSet, basename="employee")
router.register(
    "attendance/records", AttendanceRecordViewSet, basename="attendance-record"
)

urlpatterns = [
    path("", include(router.urls)),
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
]