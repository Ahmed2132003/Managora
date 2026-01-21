from django.db import IntegrityError
from django.test import TestCase

from accounting.models import Account
from core.models import Company


class AccountingModelTests(TestCase):
    def test_account_code_unique_per_company(self):
        company_a = Company.objects.create(name="Company A")
        company_b = Company.objects.create(name="Company B")

        Account.objects.create(
            company=company_a,
            code="4100",
            name="Revenue",
            type=Account.Type.INCOME,
        )
        Account.objects.create(
            company=company_b,
            code="4100",
            name="Revenue",
            type=Account.Type.INCOME,
        )

        with self.assertRaises(IntegrityError):
            Account.objects.create(
                company=company_a,
                code="4100",
                name="Revenue Duplicate",
                type=Account.Type.INCOME,
            )