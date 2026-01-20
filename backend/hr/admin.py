from django.contrib import admin

from hr.models import (
    AttendanceRecord,
    Department,
    Employee,
    EmployeeDocument,
    JobTitle,
    LeaveBalance,
    LeaveRequest,
    LeaveType,
    Shift,
    WorkSite,
)


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "company", "is_active", "is_deleted", "created_at")
    list_filter = ("company", "is_active", "is_deleted")
    search_fields = ("name", "company__name")
    ordering = ("company", "name")


@admin.register(JobTitle)
class JobTitleAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "company", "is_active", "is_deleted", "created_at")
    list_filter = ("company", "is_active", "is_deleted")
    search_fields = ("name", "company__name")
    ordering = ("company", "name")


@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "employee_code",
        "full_name",
        "company",
        "status",
        "department",
        "job_title",
        "manager",
        "is_deleted",
    )
    list_filter = ("company", "status", "is_deleted")
    search_fields = ("employee_code", "full_name", "national_id")
    ordering = ("company", "employee_code")
    autocomplete_fields = ("department", "job_title", "manager", "user")


@admin.register(EmployeeDocument)
class EmployeeDocumentAdmin(admin.ModelAdmin):
    list_display = ("id", "company", "employee", "doc_type", "title", "uploaded_by")
    list_filter = ("company", "doc_type")
    search_fields = ("title", "employee__full_name")
    ordering = ("-created_at",)
    autocomplete_fields = ("employee", "uploaded_by")


@admin.register(WorkSite)
class WorkSiteAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "name",
        "company",
        "lat",
        "lng",
        "radius_meters",
        "is_active",
    )
    list_filter = ("company", "is_active")
    search_fields = ("name", "company__name")
    ordering = ("company", "name")


@admin.register(Shift)
class ShiftAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "name",
        "company",
        "start_time",
        "end_time",
        "grace_minutes",
        "early_leave_grace_minutes",
        "min_work_minutes",
        "is_active",
    )
    list_filter = ("company", "is_active")
    search_fields = ("name", "company__name")
    ordering = ("company", "name")


@admin.register(AttendanceRecord)
class AttendanceRecordAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "company",
        "employee",
        "date",
        "check_in_time",
        "check_out_time",
        "method",
        "status",
        "late_minutes",
        "early_leave_minutes",
    )
    list_filter = ("company", "status", "method")
    search_fields = ("employee__full_name", "employee__employee_code")
    ordering = ("-date", "employee")
    autocomplete_fields = ("employee",)


@admin.register(LeaveType)
class LeaveTypeAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "name",
        "code",
        "company",
        "requires_approval",
        "paid",
        "max_per_request_days",
        "allow_negative_balance",
        "is_active",
    )
    list_filter = ("company", "is_active", "requires_approval", "paid")
    search_fields = ("name", "code", "company__name")
    ordering = ("company", "name")


@admin.register(LeaveBalance)
class LeaveBalanceAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "company",
        "employee",
        "leave_type",
        "year",
        "allocated_days",
        "used_days",
        "carryover_days",
    )
    list_filter = ("company", "year", "leave_type")
    search_fields = ("employee__full_name", "leave_type__name")
    ordering = ("company", "employee", "year")
    autocomplete_fields = ("employee", "leave_type")


@admin.register(LeaveRequest)
class LeaveRequestAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "company",
        "employee",
        "leave_type",
        "start_date",
        "end_date",
        "days",
        "status",
        "requested_at",
        "decided_at",
        "decided_by",
    )
    list_filter = ("company", "status", "leave_type")
    search_fields = ("employee__full_name", "leave_type__name")
    ordering = ("-requested_at",)
    autocomplete_fields = ("employee", "leave_type", "decided_by")