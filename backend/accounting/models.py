from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q


class ChartOfAccounts(models.Model):
    company = models.ForeignKey(
        "core.Company",
        on_delete=models.CASCADE,
        related_name="charts_of_accounts",
    )
    name = models.CharField(max_length=255)
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["company"],
                condition=Q(is_default=True),
                name="unique_default_coa_per_company",
            ),
        ]

    def __str__(self):
        return f"{self.company.name} - {self.name}"


class Account(models.Model):
    class Type(models.TextChoices):
        ASSET = "ASSET", "Asset"
        LIABILITY = "LIABILITY", "Liability"
        EQUITY = "EQUITY", "Equity"
        INCOME = "INCOME", "Income"
        EXPENSE = "EXPENSE", "Expense"

    company = models.ForeignKey(
        "core.Company",
        on_delete=models.CASCADE,
        related_name="accounts",
    )
    chart = models.ForeignKey(
        "accounting.ChartOfAccounts",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="accounts",
    )
    code = models.CharField(max_length=32)
    name = models.CharField(max_length=255)
    type = models.CharField(max_length=20, choices=Type.choices)
    parent = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="children",
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["company", "code"],
                name="unique_account_code_per_company",
            ),
        ]

    def clean(self):
        if self.parent and self.parent.company_id != self.company_id:
            raise ValidationError("Parent account must belong to the same company.")
        if self.parent and self.parent_id == self.id:
            raise ValidationError("Account cannot be its own parent.")

    def __str__(self):
        return f"{self.code} - {self.name}"


class CostCenter(models.Model):
    company = models.ForeignKey(
        "core.Company",
        on_delete=models.CASCADE,
        related_name="cost_centers",
    )
    code = models.CharField(max_length=64)
    name = models.CharField(max_length=255)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["company", "code"],
                name="unique_cost_center_code_per_company",
            ),
        ]

    def __str__(self):
        return f"{self.code} - {self.name}"


class JournalEntry(models.Model):
    class ReferenceType(models.TextChoices):
        MANUAL = "manual", "Manual"
        PAYROLL = "payroll", "Payroll"
        EXPENSE = "expense", "Expense"
        ADJUSTMENT = "adjustment", "Adjustment"

    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        POSTED = "posted", "Posted"

    company = models.ForeignKey(
        "core.Company",
        on_delete=models.CASCADE,
        related_name="journal_entries",
    )
    date = models.DateField()
    reference_type = models.CharField(
        max_length=32,
        choices=ReferenceType.choices,
        default=ReferenceType.MANUAL,
    )
    reference_id = models.CharField(max_length=64, null=True, blank=True)
    memo = models.TextField(blank=True)
    status = models.CharField(
        max_length=16,
        choices=Status.choices,
        default=Status.POSTED,
    )
    created_by = models.ForeignKey(
        "core.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="journal_entries",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["company", "date"]),
            models.Index(fields=["company", "reference_type", "reference_id"]),
        ]

    def __str__(self):
        return f"{self.company.name} - {self.date} - {self.reference_type}"


class JournalLine(models.Model):
    company = models.ForeignKey(
        "core.Company",
        on_delete=models.CASCADE,
        related_name="journal_lines",
    )
    entry = models.ForeignKey(
        "accounting.JournalEntry",
        on_delete=models.CASCADE,
        related_name="lines",
    )
    account = models.ForeignKey(
        "accounting.Account",
        on_delete=models.PROTECT,
        related_name="journal_lines",
    )
    cost_center = models.ForeignKey(
        "accounting.CostCenter",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="journal_lines",
    )
    description = models.CharField(max_length=255, blank=True)
    debit = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    credit = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                check=(
                    (Q(debit__gt=0) & Q(credit=0))
                    | (Q(credit__gt=0) & Q(debit=0))
                ),
                name="journal_line_single_sided_amount",
            ),
        ]

    def clean(self):
        if self.debit and self.credit:
            raise ValidationError("Journal line must not have both debit and credit.")
        if self.debit <= 0 and self.credit <= 0:
            raise ValidationError("Journal line must have a debit or credit amount.")
        if self.account and self.account.company_id != self.company_id:
            raise ValidationError("Account must belong to the same company.")
        if self.cost_center and self.cost_center.company_id != self.company_id:
            raise ValidationError("Cost center must belong to the same company.")

    def __str__(self):
        return f"{self.entry_id} - {self.account.code}"