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
    "accounting.view": "View chart of accounts",
    "accounting.manage_coa": "Manage chart of accounts",
    "accounting.journal.view": "View journal entries",
    "accounting.journal.post": "Post journal entries",    
    "accounting.reports.view": "View accounting reports",
    "expenses.*": "Manage expenses",    
    "expenses.view": "View expenses",
    "expenses.create": "Create expenses",
    "expenses.approve": "Approve expenses",
    "invoices.*": "Manage invoices",    
    "customers.view": "View customers",
    "customers.create": "Create customers",
    "customers.edit": "Edit customers",
    "approvals.*": "Manage approvals",        
    "hr.departments.view": "View departments",
    "hr.departments.create": "Create departments",
    "hr.departments.edit": "Edit departments",
    "hr.departments.delete": "Delete departments",
    "hr.job_titles.view": "View job titles",
    "hr.job_titles.create": "Create job titles",
    "hr.job_titles.edit": "Edit job titles",
    "hr.job_titles.delete": "Delete job titles",
    "hr.employees.view": "View employees",
    "hr.employees.create": "Create employees",
    "hr.employees.edit": "Edit employees",
    "hr.employees.delete": "Delete employees",
    "hr.documents.*": "Manage documents",
    "hr.documents.view": "View employee documents",
    "hr.documents.create": "Create employee documents",
    "hr.documents.delete": "Delete employee documents",
    "hr.payroll.view": "View payroll",
    "hr.payroll.create": "Create payroll period",
    "hr.payroll.generate": "Generate payroll runs",
    "hr.payroll.lock": "Lock payroll period",
    "hr.payroll.payslip": "Download payslips",
    "analytics.view_ceo": "View CEO analytics dashboards",
    "analytics.view_finance": "View finance analytics dashboards",
    "analytics.view_hr": "View HR analytics dashboards",
    "analytics.manage_rebuild": "Rebuild analytics KPIs",
    "analytics.alerts.view": "View analytics alerts",
    "analytics.alerts.manage": "Acknowledge or resolve analytics alerts",
    "copilot.attendance_report": "Run copilot attendance report",
    "copilot.top_late_employees": "Run copilot late employees report",
    "copilot.payroll_summary": "Run copilot payroll summary report",
    "copilot.top_debtors": "Run copilot debtors report",
    "copilot.profit_change_explain": "Run copilot profit change report",
}

ROLE_PERMISSION_MAP = {
    "Admin": list(PERMISSION_DEFINITIONS.keys()),
    "HR": [
        "employees.*",
        "attendance.*",
        "leaves.*",
        "users.view",
        "hr.departments.*",
        "hr.job_titles.*",
        "hr.employees.*",
        "hr.documents.*",
        "hr.payroll.*",
        "analytics.view_hr",
        "copilot.attendance_report",
        "copilot.top_late_employees",
        "copilot.payroll_summary",
    ],     
            
    "Accountant": [
        "accounting.*",
        "accounting.view",
        "accounting.manage_coa",
        "accounting.reports.view",
        "expenses.*",
        "invoices.*",
        "hr.payroll.*",
        "customers.view",
        "customers.create",
        "customers.edit",
        "analytics.view_finance",
        "analytics.alerts.view",
        "analytics.alerts.manage",
        "copilot.payroll_summary",
        "copilot.top_debtors",
        "copilot.profit_change_explain",
    ],                                                                                                                                                                      
    "Sales": [
        "customers.view",
    ],
    "Manager": [
        "approvals.*",
        "attendance.view_team",
        "employees.view_team",        
        "hr.employees.view",
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


def is_admin_user(user):
    return user and (user.is_superuser or user.roles.filter(name="Admin").exists())

class HasPermission(BasePermission):
    message = "You do not have permission to perform this action."

    def __init__(self, permission_code):
        self.permission_code = permission_code

    def has_permission(self, request, view):
        return user_has_permission(request.user, self.permission_code)


class HasAnyPermission(BasePermission):
    message = "You do not have permission to perform this action."

    def __init__(self, permission_codes):
        self.permission_codes = permission_codes

    def has_permission(self, request, view):
        return any(
            user_has_permission(request.user, code) for code in self.permission_codes
        )


class PermissionByActionMixin:
    permission_map = {}
    
    def get_permissions(self):
        permissions = [permission() for permission in self.permission_classes]
        permission_code = self.permission_map.get(getattr(self, "action", None))
        if permission_code:
            permissions.append(HasPermission(permission_code))
        return permissions