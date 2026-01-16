"""Permission codes and default role matrix for RBAC."""

PERMISSION_CODES = [
    "users.view",
    "users.create",
    "users.edit",
    "users.delete",
    "employees.*",
    "employees.view_team",
    "attendance.*",
    "attendance.view_team",
    "leaves.*",
    "accounting.*",
    "expenses.*",
    "invoices.*",
    "approvals.*",
]

ROLE_PERMISSIONS = {
    "Admin": ["*"],
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