from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin
from django.contrib.auth import get_user_model

from .models import Company

User = get_user_model()

@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "slug", "is_active", "created_at")
    search_fields = ("name", "slug")
    list_filter = ("is_active",)
    ordering = ("name",)

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
