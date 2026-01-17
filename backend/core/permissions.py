PERMISSION_DEFINITIONS = {
    "users.view": "View users",
    "users.create": "Create users",
    "users.edit": "Edit users",
    "users.delete": "Delete users",
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