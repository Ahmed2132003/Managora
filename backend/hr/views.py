from django.http import FileResponse, Http404
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import filters, viewsets
from rest_framework.generics import DestroyAPIView, ListCreateAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from core.permissions import PermissionByActionMixin
from hr.models import Department, Employee, JobTitle
from hr.serializers import (
    DepartmentSerializer,
    EmployeeCreateUpdateSerializer,
    EmployeeDetailSerializer,
    EmployeeSerializer,
    EmployeeDocumentCreateSerializer,
    EmployeeDocumentSerializer,
    JobTitleSerializer,
)


@extend_schema_view(
    list=extend_schema(tags=["Departments"], summary="List departments"),
    retrieve=extend_schema(tags=["Departments"], summary="Retrieve department"),
    create=extend_schema(tags=["Departments"], summary="Create department"),
    partial_update=extend_schema(tags=["Departments"], summary="Update department"),
    destroy=extend_schema(tags=["Departments"], summary="Delete department"),
)
class DepartmentViewSet(PermissionByActionMixin, viewsets.ModelViewSet):
    serializer_class = DepartmentSerializer
    permission_classes = [IsAuthenticated]
    permission_map = {
        "list": "hr.departments.view",
        "retrieve": "hr.departments.view",
        "create": "hr.departments.create",
        "partial_update": "hr.departments.edit",
        "destroy": "hr.departments.delete",
    }

    def get_queryset(self):
        return Department.objects.filter(company=self.request.user.company)

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)


@extend_schema_view(
    list=extend_schema(tags=["Job Titles"], summary="List job titles"),
    retrieve=extend_schema(tags=["Job Titles"], summary="Retrieve job title"),
    create=extend_schema(tags=["Job Titles"], summary="Create job title"),
    partial_update=extend_schema(tags=["Job Titles"], summary="Update job title"),
    destroy=extend_schema(tags=["Job Titles"], summary="Delete job title"),
)
class JobTitleViewSet(PermissionByActionMixin, viewsets.ModelViewSet):
    serializer_class = JobTitleSerializer
    permission_classes = [IsAuthenticated]
    permission_map = {
        "list": "hr.job_titles.view",
        "retrieve": "hr.job_titles.view",
        "create": "hr.job_titles.create",
        "partial_update": "hr.job_titles.edit",
        "destroy": "hr.job_titles.delete",
    }

    def get_queryset(self):
        return JobTitle.objects.filter(company=self.request.user.company)

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)


@extend_schema_view(
    list=extend_schema(tags=["Employees"], summary="List employees"),
    retrieve=extend_schema(tags=["Employees"], summary="Retrieve employee"),
    create=extend_schema(tags=["Employees"], summary="Create employee"),
    partial_update=extend_schema(tags=["Employees"], summary="Update employee"),
    destroy=extend_schema(tags=["Employees"], summary="Delete employee"),
)
class EmployeeViewSet(PermissionByActionMixin, viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["full_name", "employee_code", "national_id"]
    ordering_fields = ["full_name", "hire_date", "employee_code"]
    permission_map = {
        "list": "hr.employees.view",
        "retrieve": "hr.employees.view",
        "create": "hr.employees.create",
        "partial_update": "hr.employees.edit",
        "destroy": "hr.employees.delete",
    }

    def get_queryset(self):
        queryset = (
            Employee.objects.select_related("department", "job_title", "manager")
            .filter(company=self.request.user.company)
        )

        status_filter = self.request.query_params.get("status")
        department = self.request.query_params.get("department")
        job_title = self.request.query_params.get("job_title")

        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if department:
            queryset = queryset.filter(department_id=department)
        if job_title:
            queryset = queryset.filter(job_title_id=job_title)

        return queryset.order_by("id")

    def get_serializer_class(self):
        if self.action in {"create", "partial_update"}:
            return EmployeeCreateUpdateSerializer
        if self.action == "retrieve":
            return EmployeeDetailSerializer
        return EmployeeSerializer


@extend_schema(
    tags=["Employee Documents"],
    summary="List or create employee documents",
)
class EmployeeDocumentListCreateView(ListCreateAPIView):
    permission_classes = [IsAuthenticated]

    def get_employee(self):
        employee = get_object_or_404(Employee.all_objects, pk=self.kwargs["employee_id"])
        if employee.company_id != self.request.user.company_id:
            raise Http404
        return employee

    def get_queryset(self):
        employee = self.get_employee()
        return EmployeeDocument.objects.filter(
            company=self.request.user.company, employee=employee
        ).order_by("id")

    def get_serializer_class(self):
        if self.request.method == "POST":
            return EmployeeDocumentCreateSerializer
        return EmployeeDocumentSerializer

    def get_permissions(self):
        permissions = [permission() for permission in self.permission_classes]
        if self.request.method == "POST":
            permissions.append(
                HasAnyPermission(["hr.employees.edit", "hr.documents.create"])
            )
        else:
            permissions.append(
                HasAnyPermission(["hr.employees.view", "hr.documents.view"])
            )
        return permissions

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["employee"] = self.get_employee()
        return context


@extend_schema(
    tags=["Employee Documents"],
    summary="Download employee document",
)
class EmployeeDocumentDownloadView(APIView):
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        permissions = [permission() for permission in self.permission_classes]
        permissions.append(HasAnyPermission(["hr.employees.view", "hr.documents.view"]))
        return permissions

    def get(self, request, pk=None):
        document = get_object_or_404(EmployeeDocument.all_objects, pk=pk)
        if document.company_id != request.user.company_id:
            raise Http404
        if document.is_deleted:
            raise Http404
        return FileResponse(document.file.open("rb"), as_attachment=True)


@extend_schema(
    tags=["Employee Documents"],
    summary="Delete employee document",
)
class EmployeeDocumentDeleteView(DestroyAPIView):
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        permissions = [permission() for permission in self.permission_classes]
        permissions.append(
            HasAnyPermission(["hr.employees.edit", "hr.documents.delete"])
        )
        return permissions

    def get_queryset(self):
        return EmployeeDocument.objects.filter(company=self.request.user.company)