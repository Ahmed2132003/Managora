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