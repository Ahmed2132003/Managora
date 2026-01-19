from django.contrib import admin

from hr.models import (
    AttendanceRecord,
    Department,
    Employee,
    EmployeeDocument,
    JobTitle,
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