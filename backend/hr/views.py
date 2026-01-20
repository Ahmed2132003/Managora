from datetime import timedelta

from django.db.models import Q
from django.http import FileResponse, Http404
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.dateparse import parse_date
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import filters, status, viewsets
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.generics import DestroyAPIView, ListAPIView, ListCreateAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions import HasAnyPermission, PermissionByActionMixin, user_has_permission
from hr.models import AttendanceRecord, Department, Employee, EmployeeDocument, JobTitle
from hr.serializers import (
    AttendanceActionSerializer,
    AttendanceQrGenerateSerializer,
    AttendanceQrTokenSerializer,
    AttendanceRecordSerializer,
)
from hr.services.attendance import check_in, check_out, generate_qr_token
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


def _parse_date_param(value, label):
    if not value:
        return None
    parsed = parse_date(value)
    if not parsed:
        raise ValidationError({label: "Invalid date format. Use YYYY-MM-DD."})
    return parsed


class AttendanceCheckInView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Attendance"],
        summary="Employee check-in",
        request=AttendanceActionSerializer,
        responses={201: AttendanceRecordSerializer},
    )
    def post(self, request):
        serializer = AttendanceActionSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        employee = self._resolve_employee(request, serializer.validated_data)
        record = check_in(request.user, employee.id, serializer.validated_data)
        return Response(
            AttendanceRecordSerializer(record).data,
            status=status.HTTP_201_CREATED,
        )

    def _resolve_employee(self, request, validated_data):
        employee = validated_data["employee"]
        linked_employee = getattr(request.user, "employee_profile", None)
        if linked_employee:
            if employee.id != linked_employee.id:
                raise PermissionDenied("You can only check in for yourself.")
            return employee
        if not user_has_permission(request.user, "attendance.*"):
            raise PermissionDenied("You do not have permission to check in for others.")
        if validated_data["method"] != AttendanceRecord.Method.MANUAL:
            raise PermissionDenied(
                "Only manual check-in is allowed when acting on behalf of others."
            )
        return employee


class AttendanceCheckOutView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Attendance"],
        summary="Employee check-out",
        request=AttendanceActionSerializer,
        responses={200: AttendanceRecordSerializer},
    )
    def post(self, request):
        serializer = AttendanceActionSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        employee = self._resolve_employee(request, serializer.validated_data)
        record = check_out(request.user, employee.id, serializer.validated_data)
        return Response(AttendanceRecordSerializer(record).data)

    def _resolve_employee(self, request, validated_data):
        employee = validated_data["employee"]
        linked_employee = getattr(request.user, "employee_profile", None)
        if linked_employee:
            if employee.id != linked_employee.id:
                raise PermissionDenied("You can only check out for yourself.")
            return employee
        if not user_has_permission(request.user, "attendance.*"):
            raise PermissionDenied("You do not have permission to check out for others.")
        if validated_data["method"] != AttendanceRecord.Method.MANUAL:
            raise PermissionDenied(
                "Only manual check-out is allowed when acting on behalf of others."
            )
        return employee


class AttendanceQrGenerateView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Attendance"],
        summary="Generate attendance QR token",
        request=AttendanceQrGenerateSerializer,
        responses={201: AttendanceQrTokenSerializer},
    )
    def post(self, request):
        serializer = AttendanceQrGenerateSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        token_data = generate_qr_token(
            request.user,
            serializer.validated_data["worksite"],
            serializer.validated_data["shift"],
            serializer.validated_data["expires_in_minutes"],
        )
        return Response(
            {
                "token": token_data["token"],
                "expires_at": token_data["expires_at"],
                "worksite_id": serializer.validated_data["worksite"].id,
                "shift_id": serializer.validated_data["shift"].id,
            },
            status=status.HTTP_201_CREATED,
        )

    def get_permissions(self):
        permissions = [permission() for permission in self.permission_classes]
        permissions.append(HasAnyPermission(["attendance.*"]))
        return permissions

class AttendanceMyView(ListAPIView):
    serializer_class = AttendanceRecordSerializer
    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Attendance"],
        summary="List my attendance records",
        responses={200: AttendanceRecordSerializer(many=True)},
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    def get_queryset(self):
        employee = getattr(self.request.user, "employee_profile", None)
        if not employee:
            raise PermissionDenied("Employee profile is required.")

        date_from = _parse_date_param(
            self.request.query_params.get("date_from"), "date_from"
        )
        date_to = _parse_date_param(
            self.request.query_params.get("date_to"), "date_to"
        )

        if not date_from and not date_to:
            date_to = timezone.localdate()
            date_from = date_to - timedelta(days=30)

        queryset = AttendanceRecord.objects.filter(
            company=self.request.user.company,
            employee=employee,
        )
        if date_from:
            queryset = queryset.filter(date__gte=date_from)
        if date_to:
            queryset = queryset.filter(date__lte=date_to)
        return queryset.order_by("-date", "-check_in_time")


@extend_schema_view(
    list=extend_schema(tags=["Attendance"], summary="List attendance records"),
)
class AttendanceRecordViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AttendanceRecordSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        permissions = [permission() for permission in self.permission_classes]
        permissions.append(HasAnyPermission(["attendance.*"]))
        return permissions

    def get_queryset(self):
        queryset = AttendanceRecord.objects.select_related(
            "employee", "employee__department"
        ).filter(company=self.request.user.company)

        date_from = _parse_date_param(
            self.request.query_params.get("date_from"), "date_from"
        )
        date_to = _parse_date_param(
            self.request.query_params.get("date_to"), "date_to"
        )
        employee_id = self.request.query_params.get("employee_id")
        department_id = self.request.query_params.get("department_id")
        status_filter = self.request.query_params.get("status")
        search = self.request.query_params.get("search")

        if date_from:
            queryset = queryset.filter(date__gte=date_from)
        if date_to:
            queryset = queryset.filter(date__lte=date_to)
        if employee_id:
            queryset = queryset.filter(employee_id=employee_id)
        if department_id:
            queryset = queryset.filter(employee__department_id=department_id)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if search:
            queryset = queryset.filter(
                Q(employee__full_name__icontains=search)
                | Q(employee__employee_code__icontains=search)
            )

        return queryset.order_by("-date", "-check_in_time")