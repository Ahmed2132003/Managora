from django.conf import settings
from django.db import models
from django.db.models import Q
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
        GPS = "gps", "GPS"
        QR = "qr", "QR"
        MANUAL = "manual", "Manual"

    class Status(models.TextChoices):
        PRESENT = "present", "Present"
        LATE = "late", "Late"
        ABSENT = "absent", "Absent"
        EARLY_LEAVE = "early_leave", "Early Leave"
        INCOMPLETE = "incomplete", "Incomplete"

    employee = models.ForeignKey(
        "hr.Employee",
        on_delete=models.CASCADE,
        related_name="attendance_records",
    )
    date = models.DateField()
    check_in_time = models.DateTimeField(null=True, blank=True)
    check_out_time = models.DateTimeField(null=True, blank=True)
    check_in_lat = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    check_in_lng = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    check_out_lat = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    check_out_lng = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    method = models.CharField(max_length=10, choices=Method.choices)
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