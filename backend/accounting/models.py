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


class AccountMapping(models.Model):
    class Key(models.TextChoices):
        PAYROLL_SALARIES_EXPENSE = "PAYROLL_SALARIES_EXPENSE", "Payroll Salaries Expense"
        PAYROLL_PAYABLE = "PAYROLL_PAYABLE", "Payroll Payable"
        EXPENSE_DEFAULT_CASH = "EXPENSE_DEFAULT_CASH", "Expense Default Cash"
        EXPENSE_DEFAULT_AP = "EXPENSE_DEFAULT_AP", "Expense Default AP"

    REQUIRED_KEYS = {
        Key.PAYROLL_SALARIES_EXPENSE,
        Key.PAYROLL_PAYABLE,
    }

    company = models.ForeignKey(
        "core.Company",
        on_delete=models.CASCADE,
        related_name="account_mappings",
    )
    key = models.CharField(max_length=64, choices=Key.choices)
    account = models.ForeignKey(
        "accounting.Account",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="account_mappings",
    )
    required = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["company", "key"],
                name="unique_account_mapping_per_company_key",
            ),
        ]

    def clean(self):
        if self.account and self.account.company_id != self.company_id:
            raise ValidationError("Account must belong to the same company.")

    def save(self, *args, **kwargs):
        if not self.required:
            super().save(*args, **kwargs)
            return
        if not self.account_id and self.key in self.REQUIRED_KEYS:
            raise ValidationError("Required account mapping must include an account.")
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.company.name} - {self.key}"



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
        PAYROLL_PERIOD = "payroll_period", "Payroll Period"
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


class Expense(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        APPROVED = "approved", "Approved"

    company = models.ForeignKey(
        "core.Company",
        on_delete=models.CASCADE,
        related_name="expenses",
    )
    date = models.DateField()
    vendor_name = models.CharField(max_length=255, blank=True)
    category = models.CharField(max_length=255, blank=True)
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    currency = models.CharField(max_length=16, blank=True)
    payment_method = models.CharField(max_length=32, blank=True)
    paid_from_account = models.ForeignKey(
        "accounting.Account",
        on_delete=models.PROTECT,
        related_name="paid_expenses",
    )
    expense_account = models.ForeignKey(
        "accounting.Account",
        on_delete=models.PROTECT,
        related_name="expense_postings",
    )
    cost_center = models.ForeignKey(
        "accounting.CostCenter",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="expenses",
    )
    notes = models.TextField(blank=True)
    status = models.CharField(
        max_length=16,
        choices=Status.choices,
        default=Status.DRAFT,
    )
    created_by = models.ForeignKey(
        "core.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="expenses",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def clean(self):
        if self.paid_from_account and self.paid_from_account.company_id != self.company_id:
            raise ValidationError("Paid-from account must belong to the same company.")
        if self.expense_account and self.expense_account.company_id != self.company_id:
            raise ValidationError("Expense account must belong to the same company.")
        if self.cost_center and self.cost_center.company_id != self.company_id:
            raise ValidationError("Cost center must belong to the same company.")

    def __str__(self):
        return f"{self.company.name} - Expense {self.id}"


class ExpenseAttachment(models.Model):
    expense = models.ForeignKey(
        "accounting.Expense",
        on_delete=models.CASCADE,
        related_name="attachments",
    )
    file = models.FileField(upload_to="expense_attachments/")
    uploaded_by = models.ForeignKey(
        "core.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="expense_attachments",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"ExpenseAttachment {self.id}"