from datetime import timedelta

from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from core.models import Company, CompanySubscriptionCode

User = get_user_model()


class SubscriptionFlowTests(APITestCase):
    def setUp(self):
        self.company = Company.objects.create(name="Sub Co")
        self.super_company = Company.objects.create(name="HQ")
        self.superuser = User.objects.create_superuser(
            username="root",
            password="root-pass",
            company=self.super_company,
        )
        self.user = User.objects.create_user(
            username="u1",
            password="pass12345",
            company=self.company,
        )

    def _login(self, username: str, password: str) -> str:
        response = self.client.post(
            reverse("token_obtain_pair"),
            {"username": username, "password": password},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        return response.data["access"]

    def test_superuser_can_generate_payment_code(self):
        access = self._login("root", "root-pass")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")

        response = self.client.post(
            reverse("subscription-generate-code"),
            {"company_id": self.company.id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data["code"])
        self.assertEqual(response.data["company_id"], self.company.id)

    def test_user_can_activate_company_by_valid_code(self):
        code = CompanySubscriptionCode.objects.create(
            company=self.company,
            code="ABC12345",
            expires_at=timezone.now() + timedelta(hours=24),
        )

        access = self._login("u1", "pass12345")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")

        response = self.client.post(
            reverse("subscription-activate"),
            {"code": code.code},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.company.refresh_from_db()
        code.refresh_from_db()
        self.assertTrue(self.company.is_active)
        self.assertIsNotNone(self.company.subscription_expires_at)
        self.assertIsNotNone(code.used_at)

    def test_login_blocked_when_company_subscription_expired(self):
        self.company.subscription_expires_at = timezone.now() - timedelta(minutes=1)
        self.company.save(update_fields=["subscription_expires_at"])

        response = self.client.post(
            reverse("token_obtain_pair"),
            {"username": "u1", "password": "pass12345"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.company.refresh_from_db()
        self.assertFalse(self.company.is_active)