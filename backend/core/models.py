from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from django.utils.text import slugify

class Company(models.Model):
    name = models.CharField(max_length=255, unique=True)
    slug = models.SlugField(max_length=255, unique=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)[:255]
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name
class Permission(models.Model):
    code = models.CharField(max_length=150, unique=True)
    name = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.code


class Role(models.Model):
    company = models.ForeignKey(
        "core.Company",
        on_delete=models.CASCADE,
        related_name="roles",
    )
    name = models.CharField(max_length=150)
    slug = models.SlugField(max_length=150, blank=True)
    permissions = models.ManyToManyField(
        "core.Permission",
        through="core.RolePermission",
        related_name="roles",
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["company", "name"],
                name="unique_role_name_per_company",
            ),
            models.UniqueConstraint(
                fields=["company", "slug"],
                name="unique_role_slug_per_company",
            ),
        ]

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)[:150]
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.company.name} - {self.name}"


class RolePermission(models.Model):
    role = models.ForeignKey(
        "core.Role",
        on_delete=models.CASCADE,
        related_name="role_permissions",
    )
    permission = models.ForeignKey(
        "core.Permission",
        on_delete=models.CASCADE,
        related_name="role_permissions",
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["role", "permission"],
                name="unique_permission_per_role",
            ),
        ]

    def __str__(self):
        return f"{self.role.name} -> {self.permission.code}"

class UserManager(BaseUserManager):
    use_in_migrations = True
    def create_user(self, username, email=None, password=None, **extra_fields):
        user = self.model(username=username, email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, username, email=None, password=None, **extra_fields):
        # مهم: email في AbstractUser غالبًا NOT NULL، فممنوع ندخل None
        if email is None:
            email = ""
        else:
            email = self.normalize_email(email)

        user = self.model(username=username, email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user
    def create_superuser(self, username, email=None, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")

        return self.create_user(username=username, email=email, password=password, **extra_fields)



class User(AbstractUser):
    company = models.ForeignKey(
        "core.Company",
        on_delete=models.PROTECT,
        related_name="users",
    )
    roles = models.ManyToManyField(
        "core.Role",
        through="core.UserRole",
        related_name="users",
        blank=True,
    )    
    objects = UserManager()
    def __str__(self):
        return self.username

class UserRole(models.Model):
    user = models.ForeignKey(
        "core.User",
        on_delete=models.CASCADE,
        related_name="user_roles",
    )
    role = models.ForeignKey(
        "core.Role",
        on_delete=models.CASCADE,
        related_name="user_roles",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "role"],
                name="unique_role_per_user",
            ),
        ]

    def __str__(self):
        return f"{self.user.username} -> {self.role.name}"


class AuditLog(models.Model):
    company = models.ForeignKey(
        "core.Company",
        on_delete=models.CASCADE,
        related_name="audit_logs",
    )
    actor = models.ForeignKey(
        "core.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_logs",
    )
    action = models.CharField(max_length=150)
    entity = models.CharField(max_length=150)
    entity_id = models.CharField(max_length=64)
    payload = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.company.name} - {self.action} - {self.entity}:{self.entity_id}"


class SetupTemplate(models.Model):
    code = models.CharField(max_length=100, unique=True)
    name_ar = models.CharField(max_length=255)
    name_en = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    version = models.PositiveIntegerField(default=1)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.code


class TemplateApplyLog(models.Model):
    class Status(models.TextChoices):
        STARTED = "started", "Started"
        SUCCEEDED = "succeeded", "Succeeded"
        FAILED = "failed", "Failed"

    company = models.ForeignKey(
        "core.Company",
        on_delete=models.CASCADE,
        related_name="template_apply_logs",
    )
    template_code = models.CharField(max_length=100)
    template_version = models.PositiveIntegerField()
    status = models.CharField(max_length=20, choices=Status.choices)
    error = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(
                fields=["company", "template_code", "template_version"],
                name="core_template_log_idx",
            ),
        ]

    def __str__(self):
        return f"{self.company.name} - {self.template_code} v{self.template_version}"


class CompanySetupState(models.Model):
    company = models.OneToOneField(
        "core.Company",
        on_delete=models.CASCADE,
        related_name="setup_state",
    )
    roles_applied = models.BooleanField(default=False)
    policies_applied = models.BooleanField(default=False)
    shifts_applied = models.BooleanField(default=False)
    coa_applied = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.company.name} setup state"