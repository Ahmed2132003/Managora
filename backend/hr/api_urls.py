from django.urls import include, path
from rest_framework.routers import DefaultRouter

from hr.views import DepartmentViewSet, EmployeeViewSet, JobTitleViewSet

router = DefaultRouter()
router.register("departments", DepartmentViewSet, basename="department")
router.register("job-titles", JobTitleViewSet, basename="job-title")
router.register("employees", EmployeeViewSet, basename="employee")

urlpatterns = [
    path("", include(router.urls)),
]