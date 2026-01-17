from rest_framework.permissions import BasePermission

from core.models import Permission


PERMISSION_DEFINITIONS = {
    "users.view": "View users",
    "users.create": "Create users",
    "users.edit": "Edit users",
    "users.delete": "Delete users",
    "users.reset_password": "Reset user passwords",    
    "employees.*": "Manage employees",
    "employees.view_team": "View team employees",
    "attendance.*": "Manage attendance",
    "attendance.view_team": "View team attendance",
    "leaves.*": "Manage leaves",
    "accounting.*": "Manage accounting",
    "expenses.*": "Manage expenses",
    "invoices.*": "Manage invoices",
    "approvals.*": "Manage approvals",
}

ROLE_PERMISSION_MAP = {
    "Admin": list(PERMISSION_DEFINITIONS.keys()),
    "HR": [
        "employees.*",
        "attendance.*",
        "leaves.*",
        "users.view",
    ],
    "Accountant": [
        "accounting.*",
        "expenses.*",
        "invoices.*",
    ],
    "Manager": [
        "approvals.*",
        "attendance.view_team",
        "employees.view_team",
    ],
}


def _permission_code_matches(granted_code, required_code):
    if granted_code == required_code:
        return True
    if granted_code.endswith(".*"):
        prefix = granted_code[:-2]
        return required_code.startswith(f"{prefix}.")
    return False


def user_permission_codes(user):
    if not user or not user.is_authenticated:
        return set()

    return set(
        Permission.objects.filter(roles__users=user).values_list("code", flat=True)
    )


def user_has_permission(user, required_code):
    if not user or not user.is_authenticated:
        return False
    if user.is_superuser:
        return True

    codes = user_permission_codes(user)
    return any(
        _permission_code_matches(code, required_code) for code in codes
    )


class HasPermission(BasePermission):
    message = "You do not have permission to perform this action."

    def __init__(self, permission_code):
        self.permission_code = permission_code

    def has_permission(self, request, view):
        return user_has_permission(request.user, self.permission_code)


class PermissionByActionMixin:
    permission_map = {}

    def get_permissions(self):
        permissions = [permission() for permission in self.permission_classes]
        permission_code = self.permission_map.get(getattr(self, "action", None))
        if permission_code:
            permissions.append(HasPermission(permission_code))
        return permissions