from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from core.models import Company

User = get_user_model()


@override_settings(
    REST_FRAMEWORK={
        "DEFAULT_AUTHENTICATION_CLASSES": (
            "core.authentication.AuditJWTAuthentication",
        ),
        "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.IsAuthenticated",),
        "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
        "DEFAULT_THROTTLE_RATES": {
            "analytics": "120/min",
            "login": "5/min",
            "copilot": "30/min",
            "export": "30/min",
        },
    }
)
class RateLimitTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.company = Company.objects.create(name="Throttle Co")
        self.user = User.objects.create_user(
            username="throttle-user",
            password="pass12345",
            company=self.company,
        )

    def test_login_rate_limit(self):
        url = reverse("token_obtain_pair")
        payload = {"username": "throttle-user", "password": "pass12345"}

        for _ in range(5):
            response = self.client.post(url, payload, format="json")
            self.assertEqual(response.status_code, status.HTTP_200_OK)

        blocked = self.client.post(url, payload, format="json")
        self.assertEqual(blocked.status_code, status.HTTP_429_TOO_MANY_REQUESTS)