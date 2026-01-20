from datetime import timedelta

from django.db.models import Q
from django.http import FileResponse, Http404
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.dateparse import parse_date
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import filters, status, viewsets
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.generics import CreateAPIView, DestroyAPIView, ListAPIView, ListCreateAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions import HasAnyPermission, PermissionByActionMixin, user_has_permission
from hr.models import (
    AttendanceRecord,
    Department,
    Employee,
    EmployeeDocument,
    JobTitle,
    LeaveBalance,
    LeaveRequest,
    LeaveType,
)
from hr.services.attendance import check_in, check_out, generate_qr_token
from hr.serializers import (
    DepartmentSerializer,
    AttendanceActionSerializer,
    AttendanceQrGenerateSerializer,
    AttendanceQrTokenSerializer,
    AttendanceRecordSerializer,    
    EmployeeCreateUpdateSerializer,
    EmployeeDetailSerializer,
    EmployeeSerializer,
    EmployeeDocumentCreateSerializer,
    EmployeeDocumentSerializer,
    JobTitleSerializer,
    LeaveBalanceSerializer,
    LeaveDecisionSerializer,
    LeaveRequestCreateSerializer,
    LeaveRequestSerializer,
    LeaveTypeSerializer,
)
from hr.services.leaves import approve_leave, reject_leave

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

def _get_user_employee(user):
    employee = getattr(user, "employee_profile", None)
    if not employee or employee.is_deleted or employee.company_id != user.company_id:
        raise PermissionDenied("Employee profile is required.")
    return employee


def _user_can_approve(user, leave_request):
    if user_has_permission(user, "leaves.*"):
        return True
    if user_has_permission(user, "approvals.*"):
        manager_employee = getattr(user, "employee_profile", None)
        if not manager_employee or manager_employee.is_deleted:
            return False
        return leave_request.employee.manager_id == manager_employee.id
    return False


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


@extend_schema_view(
    list=extend_schema(tags=["Leaves"], summary="List leave types"),
    retrieve=extend_schema(tags=["Leaves"], summary="Retrieve leave type"),
    create=extend_schema(tags=["Leaves"], summary="Create leave type"),
    partial_update=extend_schema(tags=["Leaves"], summary="Update leave type"),
    destroy=extend_schema(tags=["Leaves"], summary="Delete leave type"),
)
class LeaveTypeViewSet(viewsets.ModelViewSet):
    serializer_class = LeaveTypeSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        permissions = [permission() for permission in self.permission_classes]
        if self.action in {"create", "partial_update", "destroy"}:
            permissions.append(HasAnyPermission(["leaves.*"]))
        return permissions

    def get_queryset(self):
        queryset = LeaveType.objects.filter(company=self.request.user.company)
        if not user_has_permission(self.request.user, "leaves.*"):
            queryset = queryset.filter(is_active=True)
        return queryset.order_by("name")

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)

    def perform_update(self, serializer):
        serializer.save(company=self.request.user.company)


@extend_schema_view(
    list=extend_schema(tags=["Leaves"], summary="List leave balances"),
    create=extend_schema(tags=["Leaves"], summary="Create leave balance"),
    partial_update=extend_schema(tags=["Leaves"], summary="Update leave balance"),
)
class LeaveBalanceViewSet(viewsets.ModelViewSet):
    serializer_class = LeaveBalanceSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_permissions(self):
        permissions = [permission() for permission in self.permission_classes]
        permissions.append(HasAnyPermission(["leaves.*"]))
        return permissions

    def get_queryset(self):
        return (
            LeaveBalance.objects.select_related("employee", "leave_type")
            .filter(company=self.request.user.company)
            .order_by("-year", "employee__id")
        )

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)


@extend_schema(
    tags=["Leaves"],
    summary="List my leave balances",
)
class LeaveBalanceMyView(ListAPIView):
    serializer_class = LeaveBalanceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        employee = _get_user_employee(self.request.user)
        queryset = LeaveBalance.objects.select_related("leave_type").filter(
            company=self.request.user.company, employee=employee
        )
        year = self.request.query_params.get("year")
        if year:
            queryset = queryset.filter(year=year)
        return queryset.order_by("-year", "leave_type__name")


@extend_schema(
    tags=["Leaves"],
    summary="Create leave request",
    request=LeaveRequestCreateSerializer,
    responses={201: LeaveRequestSerializer},
)
class LeaveRequestCreateView(CreateAPIView):
    serializer_class = LeaveRequestCreateSerializer
    permission_classes = [IsAuthenticated]

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["employee"] = _get_user_employee(self.request.user)
        return context

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        leave_request = serializer.save()
        return Response(
            LeaveRequestSerializer(leave_request).data, status=status.HTTP_201_CREATED
        )


@extend_schema(
    tags=["Leaves"],
    summary="List my leave requests",
)
class LeaveRequestMyListView(ListAPIView):
    serializer_class = LeaveRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        employee = _get_user_employee(self.request.user)
        queryset = LeaveRequest.objects.select_related("employee", "leave_type").filter(
            company=self.request.user.company, employee=employee
        )

        status_filter = self.request.query_params.get("status")
        if status_filter:
            status_value = status_filter.lower()
            if status_value not in LeaveRequest.Status.values:
                raise ValidationError({"status": "Invalid status value."})
            queryset = queryset.filter(status=status_value)

        date_from = _parse_date_param(
            self.request.query_params.get("date_from"), "date_from"
        )
        date_to = _parse_date_param(
            self.request.query_params.get("date_to"), "date_to"
        )
        leave_type_id = self.request.query_params.get("leave_type")

        if date_from:
            queryset = queryset.filter(start_date__gte=date_from)
        if date_to:
            queryset = queryset.filter(end_date__lte=date_to)
        if leave_type_id:
            queryset = queryset.filter(leave_type_id=leave_type_id)

        return queryset.order_by("-requested_at")


@extend_schema(
    tags=["Leaves"],
    summary="Cancel leave request",
    responses={200: LeaveRequestSerializer},
)
class LeaveRequestCancelView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, id=None):
        employee = _get_user_employee(request.user)
        leave_request = get_object_or_404(
            LeaveRequest, id=id, company=request.user.company, employee=employee
        )
        if leave_request.status != LeaveRequest.Status.PENDING:
            raise ValidationError("Only pending requests can be cancelled.")

        leave_request.status = LeaveRequest.Status.CANCELLED
        leave_request.decided_by = request.user
        leave_request.decided_at = timezone.now()
        leave_request.save(update_fields=["status", "decided_by", "decided_at"])
        return Response(LeaveRequestSerializer(leave_request).data)


@extend_schema(
    tags=["Leaves"],
    summary="Approvals inbox",
)
class LeaveApprovalsInboxView(ListAPIView):
    serializer_class = LeaveRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = LeaveRequest.objects.select_related("employee", "leave_type").filter(
            company=user.company
        )

        if user_has_permission(user, "leaves.*"):
            pass
        elif user_has_permission(user, "approvals.*"):
            manager_employee = getattr(user, "employee_profile", None)
            if not manager_employee or manager_employee.is_deleted:
                raise PermissionDenied("Manager profile is required.")
            queryset = queryset.filter(employee__manager=manager_employee)
        else:
            raise PermissionDenied("You do not have permission to view approvals.")

        status_filter = self.request.query_params.get("status") or LeaveRequest.Status.PENDING
        if status_filter:
            status_value = status_filter.lower()
            if status_value not in LeaveRequest.Status.values:
                raise ValidationError({"status": "Invalid status value."})
            queryset = queryset.filter(status=status_value)

        employee_search = self.request.query_params.get("employee")
        if employee_search:
            queryset = queryset.filter(
                Q(employee__full_name__icontains=employee_search)
                | Q(employee__employee_code__icontains=employee_search)
            )

        return queryset.order_by("-requested_at")


@extend_schema(
    tags=["Leaves"],
    summary="Approve leave request",
    responses={200: LeaveRequestSerializer},
)
class LeaveApproveView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, id=None):
        leave_request = get_object_or_404(
            LeaveRequest, id=id, company=request.user.company
        )
        if not _user_can_approve(request.user, leave_request):
            raise PermissionDenied("You do not have permission to approve this request.")

        leave_request = approve_leave(request.user, leave_request.id)
        return Response(LeaveRequestSerializer(leave_request).data)


@extend_schema(
    tags=["Leaves"],
    summary="Reject leave request",
    request=LeaveDecisionSerializer,
    responses={200: LeaveRequestSerializer},
)
class LeaveRejectView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, id=None):
        leave_request = get_object_or_404(
            LeaveRequest, id=id, company=request.user.company
        )
        if not _user_can_approve(request.user, leave_request):
            raise PermissionDenied("You do not have permission to reject this request.")

        serializer = LeaveDecisionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        leave_request = reject_leave(
            request.user, leave_request.id, serializer.validated_data.get("reason")
        )
        return Response(LeaveRequestSerializer(leave_request).data)