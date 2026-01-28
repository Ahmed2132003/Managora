from django.contrib import admin
from django.contrib.auth import get_user_model
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin
from .models import (
    AuditLog,
    ExportLog,
    Company,
    Permission,
    Role,
    RolePermission,
    UserRole,
)

User = get_user_model()

class RolePermissionInline(admin.TabularInline):
    model = RolePermission
    extra = 0
    autocomplete_fields = ("permission",)


class UserRoleInline(admin.TabularInline):
    model = UserRole
    extra = 0
    autocomplete_fields = ("role",)



@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "name",
        "slug",
        "is_active",
        "attendance_qr_worksite",
        "attendance_qr_start_time",
        "attendance_qr_end_time",
        "created_at",
    )    
    search_fields = ("name", "slug")
    list_filter = ("is_active",)
    ordering = ("name",)
    autocomplete_fields = ("attendance_qr_worksite",)
    
@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    # نضيف company في شاشة التعديل
    fieldsets = DjangoUserAdmin.fieldsets + (
        ("Company / Tenant", {"fields": ("company",)}),
    )

    # نضيف company في شاشة الإنشاء
    add_fieldsets = DjangoUserAdmin.add_fieldsets + (
        ("Company / Tenant", {"fields": ("company",)}),
    )

    list_display = (
        "username",
        "email",
        "first_name",
        "last_name",
        "company",
        "is_staff",
        "is_active",
    )
    list_filter = ("company", "is_staff", "is_active")
    search_fields = ("username", "email", "first_name", "last_name")
    inlines = [UserRoleInline]


@admin.register(Permission)
class PermissionAdmin(admin.ModelAdmin):
    list_display = ("id", "code", "name", "created_at")
    search_fields = ("code", "name")
    ordering = ("code",)


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "company", "slug", "created_at")
    search_fields = ("name", "slug")
    list_filter = ("company",)
    ordering = ("company", "name")
    inlines = [RolePermissionInline]


@admin.register(RolePermission)
class RolePermissionAdmin(admin.ModelAdmin):
    list_display = ("id", "role", "permission")
    list_filter = ("role__company",)
    search_fields = ("role__name", "permission__code")
    autocomplete_fields = ("role", "permission")


@admin.register(UserRole)
class UserRoleAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "role", "created_at")
    list_filter = ("role__company",)
    search_fields = ("user__username", "role__name")
    autocomplete_fields = ("user", "role")


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("id", "company", "actor", "action", "entity", "created_at")
    list_filter = ("company", "action", "entity")
    search_fields = ("entity", "entity_id", "actor__username")
    ordering = ("-created_at",)


@admin.register(ExportLog)
class ExportLogAdmin(admin.ModelAdmin):
    list_display = ("id", "company", "actor", "export_type", "row_count", "created_at")
    list_filter = ("company", "export_type")
    search_fields = ("export_type", "actor__username")
    ordering = ("-created_at",)