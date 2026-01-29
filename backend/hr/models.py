from decimal import Decimal

from django.conf import settings
from django.db import models
from django.db.models import F, Q
from django.utils import timezone


class SoftDeleteQuerySet(models.QuerySet):
    def delete(self):
        return super().update(is_deleted=True, deleted_at=timezone.now())

    def hard_delete(self):
        return super().delete()

    def alive(self):
        return self.filter(is_deleted=False)


class SoftDeleteManager(models.Manager):
    def get_queryset(self):
        return SoftDeleteQuerySet(self.model, using=self._db).filter(is_deleted=False)

    def hard_delete(self):
        return self.get_queryset().hard_delete()


class BaseModel(models.Model):
    company = models.ForeignKey(
        "core.Company",
        on_delete=models.CASCADE,
        related_name="%(class)ss",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)

    objects = SoftDeleteManager()
    all_objects = models.Manager()

    class Meta:
        abstract = True

    def delete(self, using=None, keep_parents=False):
        self.is_deleted = True
        self.deleted_at = timezone.now()
        self.save(update_fields=["is_deleted", "deleted_at"])

    def hard_delete(self):
        return super().delete()


class Department(BaseModel):
    name = models.CharField(max_length=255)
    is_active = models.BooleanField(default=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["company", "name"],
                name="unique_department_name_per_company",
            ),
        ]

    def __str__(self):
        return f"{self.company.name} - {self.name}"


class JobTitle(BaseModel):
    name = models.CharField(max_length=255)
    is_active = models.BooleanField(default=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["company", "name"],
                name="unique_job_title_name_per_company",
            ),
        ]

    def __str__(self):
        return f"{self.company.name} - {self.name}"


class EmployeeQuerySet(SoftDeleteQuerySet):
    def active(self):
        return self.filter(is_deleted=False)


class EmployeeManager(SoftDeleteManager):
    def get_queryset(self):
        return EmployeeQuerySet(self.model, using=self._db).filter(is_deleted=False)

    def active(self):
        return self.get_queryset()


class Employee(BaseModel):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        INACTIVE = "inactive", "Inactive"
        TERMINATED = "terminated", "Terminated"

    employee_code = models.CharField(max_length=100)
    full_name = models.CharField(max_length=255)
    national_id = models.CharField(max_length=100, null=True, blank=True)
    hire_date = models.DateField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    department = models.ForeignKey(
        "hr.Department",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="employees",
    )
    job_title = models.ForeignKey(
        "hr.JobTitle",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="employees",
    )
    manager = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="subordinates",
    )
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="employee_profile",
    )
    shift = models.ForeignKey(
        "hr.Shift",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="employees",
    )
    
    objects = EmployeeManager()
    all_objects = models.Manager()

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["company", "employee_code"],
                name="unique_employee_code_per_company",
            ),
            models.UniqueConstraint(
                fields=["company", "national_id"],
                condition=Q(national_id__isnull=False),
                name="unique_employee_national_id_per_company",
            ),
        ]

    def __str__(self):
        return f"{self.company.name} - {self.full_name}"


def employee_document_upload_to(instance, filename):
    return (
        f"companies/{instance.company_id}/employees/{instance.employee_id}/documents/{filename}"
    )


class EmployeeDocument(BaseModel):
    class DocumentType(models.TextChoices):
        CONTRACT = "contract", "Contract"
        ID = "id", "ID"
        OTHER = "other", "Other"

    employee = models.ForeignKey(
        "hr.Employee",
        on_delete=models.CASCADE,
        related_name="documents",
    )
    doc_type = models.CharField(max_length=20, choices=DocumentType.choices)
    title = models.CharField(max_length=255, blank=True)
    file = models.FileField(upload_to=employee_document_upload_to)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="uploaded_employee_documents",
    )

    def __str__(self):
        return f"{self.company.name} - {self.employee.full_name} - {self.doc_type}"


class WorkSite(BaseModel):
    name = models.CharField(max_length=255)
    lat = models.DecimalField(max_digits=9, decimal_places=6)
    lng = models.DecimalField(max_digits=9, decimal_places=6)
    radius_meters = models.PositiveIntegerField()
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.company.name} - {self.name}"


class Shift(BaseModel):
    name = models.CharField(max_length=255)
    start_time = models.TimeField()
    end_time = models.TimeField()
    grace_minutes = models.PositiveIntegerField()
    early_leave_grace_minutes = models.PositiveIntegerField(null=True, blank=True)
    min_work_minutes = models.PositiveIntegerField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.company.name} - {self.name}"


class AttendanceRecord(BaseModel):
    class Method(models.TextChoices):
        # Legacy methods (kept for backward compatibility / old data)
        GPS = "gps", "GPS"
        QR = "qr", "QR"
        MANUAL = "manual", "Manual"
        # New method
        EMAIL_OTP = "email_otp", "Email OTP"

    class Status(models.TextChoices):
        PRESENT = "present", "Present"
        LATE = "late", "Late"
        ABSENT = "absent", "Absent"
        EARLY_LEAVE = "early_leave", "Early Leave"
        INCOMPLETE = "incomplete", "Incomplete"

    class ApprovalStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    employee = models.ForeignKey(
        "hr.Employee",
        on_delete=models.CASCADE,
        related_name="attendance_records",
    )
    date = models.DateField()

    # Times
    check_in_time = models.DateTimeField(null=True, blank=True)
    check_out_time = models.DateTimeField(null=True, blank=True)

    # Locations
    check_in_lat = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    check_in_lng = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    check_out_lat = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    check_out_lng = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)

    # Distance to allowed worksite (meters)
    check_in_distance_meters = models.PositiveIntegerField(null=True, blank=True)
    check_out_distance_meters = models.PositiveIntegerField(null=True, blank=True)

    # Approval per action (check-in / check-out)
    check_in_approval_status = models.CharField(
        max_length=10,
        choices=ApprovalStatus.choices,
        null=True,
        blank=True,
    )
    check_out_approval_status = models.CharField(
        max_length=10,
        choices=ApprovalStatus.choices,
        null=True,
        blank=True,
    )
    check_in_approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="attendance_checkin_approvals",
    )
    check_out_approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="attendance_checkout_approvals",
    )
    check_in_approved_at = models.DateTimeField(null=True, blank=True)
    check_out_approved_at = models.DateTimeField(null=True, blank=True)
    check_in_rejection_reason = models.TextField(null=True, blank=True)
    check_out_rejection_reason = models.TextField(null=True, blank=True)

    # General
    method = models.CharField(max_length=20, choices=Method.choices)
    status = models.CharField(max_length=20, choices=Status.choices)
    late_minutes = models.PositiveIntegerField(default=0)
    early_leave_minutes = models.PositiveIntegerField(default=0)
    notes = models.TextField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["company", "employee", "date"],
                name="unique_attendance_record_per_day",
            ),
        ]
        indexes = [
            models.Index(fields=["company", "date"], name="attendance_comp_date_idx"),
            models.Index(
                fields=["company", "employee", "date"],
                name="attendance_comp_emp_date_idx",
            ),
        ]

    def __str__(self):
        return f"{self.company.name} - {self.employee.full_name} - {self.date}"


class AttendanceOtpRequest(BaseModel):
    """OTP request for self attendance actions (check-in / check-out)."""

    class Purpose(models.TextChoices):
        CHECK_IN = "checkin", "Check-in"
        CHECK_OUT = "checkout", "Check-out"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="attendance_otp_requests",
    )
    purpose = models.CharField(max_length=10, choices=Purpose.choices)
    code_salt = models.CharField(max_length=64)
    code_hash = models.CharField(max_length=64)
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)
    attempts = models.PositiveIntegerField(default=0)
    max_attempts = models.PositiveIntegerField(default=5)

    class Meta:
        indexes = [
            models.Index(fields=["company", "user", "expires_at"], name="att_otp_company_user_idx"),
        ]

    def is_expired(self) -> bool:
        return timezone.now() > self.expires_at

    def mark_used(self) -> None:
        self.used_at = timezone.now()
        self.save(update_fields=["used_at"])

    def __str__(self) -> str:
        return f"{self.company.name} OTP {self.purpose} for {self.user_id}"



class PolicyRule(BaseModel):
    class RuleType(models.TextChoices):
        LATE_OVER_MINUTES = "late_over_minutes", "Late over minutes"
        LATE_COUNT_OVER_PERIOD = "late_count_over_period", "Late count over period"
        ABSENT_COUNT_OVER_PERIOD = "absent_count_over_period", "Absent count over period"

    class ActionType(models.TextChoices):
        WARNING = "warning", "Warning"
        DEDUCTION = "deduction", "Deduction"

    name = models.CharField(max_length=255)
    rule_type = models.CharField(max_length=50, choices=RuleType.choices)
    threshold = models.PositiveIntegerField()
    period_days = models.PositiveIntegerField(null=True, blank=True)
    action_type = models.CharField(max_length=20, choices=ActionType.choices)
    action_value = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.company.name} - {self.name}"


class HRAction(BaseModel):
    class ActionType(models.TextChoices):
        WARNING = "warning", "Warning"
        DEDUCTION = "deduction", "Deduction"

    employee = models.ForeignKey(
        "hr.Employee",
        on_delete=models.CASCADE,
        related_name="hr_actions",
    )
    rule = models.ForeignKey(
        "hr.PolicyRule",
        on_delete=models.CASCADE,
        related_name="actions",
    )
    attendance_record = models.ForeignKey(
        "hr.AttendanceRecord",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="hr_actions",
    )
    action_type = models.CharField(max_length=20, choices=ActionType.choices)
    value = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0"))
    reason = models.TextField()
    period_start = models.DateField(null=True, blank=True)
    period_end = models.DateField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["company", "employee", "rule", "attendance_record"],
                condition=Q(attendance_record__isnull=False),
                name="unique_hr_action_per_attendance",
            ),
            models.UniqueConstraint(
                fields=["company", "employee", "rule", "period_start", "period_end"],
                condition=Q(period_start__isnull=False, period_end__isnull=False),
                name="unique_hr_action_per_period",
            ),
        ]

    def __str__(self):
        return f"{self.company.name} - {self.employee.full_name} - {self.action_type}"


class LeaveType(BaseModel):
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=50)
    requires_approval = models.BooleanField(default=True)
    paid = models.BooleanField(default=True)
    max_per_request_days = models.PositiveIntegerField(null=True, blank=True)
    allow_negative_balance = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["company", "code"],
                name="unique_leave_type_code_per_company",
            ),
            models.UniqueConstraint(
                fields=["company", "name"],
                name="unique_leave_type_name_per_company",
            ),
        ]

    def __str__(self):
        return f"{self.company.name} - {self.name}"


class LeaveBalance(BaseModel):
    employee = models.ForeignKey(
        "hr.Employee",
        on_delete=models.CASCADE,
        related_name="leave_balances",
    )
    leave_type = models.ForeignKey(
        "hr.LeaveType",
        on_delete=models.CASCADE,
        related_name="balances",
    )
    year = models.PositiveIntegerField()
    allocated_days = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal("0"))
    used_days = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal("0"))
    carryover_days = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["company", "employee", "leave_type", "year"],
                name="unique_leave_balance_per_year",
            ),
        ]
        indexes = [
            models.Index(fields=["company", "employee"], name="leave_balance_comp_emp_idx"),
        ]

    @property
    def remaining_days(self):
        carryover = self.carryover_days or Decimal("0")
        return self.allocated_days + carryover - self.used_days

    def __str__(self):
        return f"{self.company.name} - {self.employee.full_name} - {self.leave_type.code}"


class LeaveRequest(BaseModel):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"
        CANCELLED = "cancelled", "Cancelled"

    employee = models.ForeignKey(
        "hr.Employee",
        on_delete=models.CASCADE,
        related_name="leave_requests",
    )
    leave_type = models.ForeignKey(
        "hr.LeaveType",
        on_delete=models.CASCADE,
        related_name="leave_requests",
    )
    start_date = models.DateField()
    end_date = models.DateField()
    days = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal("0"))
    reason = models.TextField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    requested_at = models.DateTimeField(auto_now_add=True)
    decided_at = models.DateTimeField(null=True, blank=True)
    decided_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="decided_leave_requests",
    )
    reject_reason = models.TextField(null=True, blank=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                check=Q(end_date__gte=F("start_date")),
                name="leave_request_end_after_start",
            ),
        ]
        indexes = [
            models.Index(fields=["company", "status"], name="leave_req_comp_status_idx"),
            models.Index(
                fields=["company", "employee", "start_date"],
                name="leave_req_comp_emp_start_idx",
            ),
        ]

    def save(self, *args, **kwargs):
        if self.start_date and self.end_date:
            delta_days = (self.end_date - self.start_date).days + 1
            self.days = Decimal(delta_days)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.company.name} - {self.employee.full_name} - {self.start_date}"


class PayrollPeriod(BaseModel):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        LOCKED = "locked", "Locked"

    year = models.PositiveIntegerField()
    month = models.PositiveSmallIntegerField()
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.DRAFT)
    locked_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_payroll_periods",
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["company", "year", "month"],
                name="unique_payroll_period_per_company",
            ),
        ]

    def __str__(self):
        return f"{self.company.name} - {self.year}/{self.month:02d}"


class SalaryStructure(BaseModel):
    employee = models.OneToOneField(
        "hr.Employee",
        on_delete=models.CASCADE,
        related_name="salary_structure",
    )
    basic_salary = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=10, null=True, blank=True)

    def save(self, *args, **kwargs):
        if self.employee_id:
            self.company_id = self.employee.company_id
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.company.name} - {self.employee.full_name}"


class SalaryComponent(BaseModel):
    class ComponentType(models.TextChoices):
        EARNING = "earning", "Earning"
        DEDUCTION = "deduction", "Deduction"

    salary_structure = models.ForeignKey(
        "hr.SalaryStructure",
        on_delete=models.CASCADE,
        related_name="components",
    )
    name = models.CharField(max_length=255)
    type = models.CharField(max_length=10, choices=ComponentType.choices)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    is_recurring = models.BooleanField(default=True)

    def save(self, *args, **kwargs):
        if self.salary_structure_id:
            self.company_id = self.salary_structure.company_id
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.company.name} - {self.name}"


class LoanAdvance(BaseModel):
    class LoanType(models.TextChoices):
        LOAN = "loan", "Loan"
        ADVANCE = "advance", "Advance"

    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        CLOSED = "closed", "Closed"

    employee = models.ForeignKey(
        "hr.Employee",
        on_delete=models.CASCADE,
        related_name="loan_advances",
    )
    type = models.CharField(max_length=10, choices=LoanType.choices)
    principal_amount = models.DecimalField(max_digits=12, decimal_places=2)
    start_date = models.DateField()
    installment_amount = models.DecimalField(max_digits=12, decimal_places=2)
    remaining_amount = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.ACTIVE)

    def save(self, *args, **kwargs):
        if self.employee_id:
            self.company_id = self.employee.company_id
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.company.name} - {self.employee.full_name} - {self.type}"


class PayrollRun(BaseModel):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        APPROVED = "approved", "Approved"

    period = models.ForeignKey(
        "hr.PayrollPeriod",
        on_delete=models.CASCADE,
        related_name="runs",
    )
    employee = models.ForeignKey(
        "hr.Employee",
        on_delete=models.CASCADE,
        related_name="payroll_runs",
    )
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.DRAFT)
    earnings_total = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0"))
    deductions_total = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0"))
    net_total = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0"))
    generated_at = models.DateTimeField(null=True, blank=True)
    generated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="generated_payroll_runs",
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["period", "employee"],
                name="unique_payroll_run_per_period_employee",
            ),
        ]

    def save(self, *args, **kwargs):
        if self.period_id:
            self.company_id = self.period.company_id
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.company.name} - {self.employee.full_name} - {self.period.year}/{self.period.month:02d}"


class PayrollLine(BaseModel):
    class LineType(models.TextChoices):
        EARNING = "earning", "Earning"
        DEDUCTION = "deduction", "Deduction"

    payroll_run = models.ForeignKey(
        "hr.PayrollRun",
        on_delete=models.CASCADE,
        related_name="lines",
    )
    code = models.CharField(max_length=50)
    name = models.CharField(max_length=255)
    type = models.CharField(max_length=10, choices=LineType.choices)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    meta = models.JSONField(default=dict, blank=True)

    def save(self, *args, **kwargs):
        if self.payroll_run_id:
            self.company_id = self.payroll_run.company_id
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.company.name} - {self.code} - {self.amount}"