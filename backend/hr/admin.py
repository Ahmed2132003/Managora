from django.contrib import admin

from hr.models import Department, Employee, EmployeeDocument, JobTitle


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