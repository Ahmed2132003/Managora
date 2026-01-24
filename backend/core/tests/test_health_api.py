from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase


class HealthApiTests(APITestCase):
    def test_health_endpoint_reports_status(self):
        response = self.client.get(reverse("health"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn(response.data["status"], {"ok", "degraded"})
        self.assertIn(response.data["db"], {"ok", "error"})
        self.assertIn(response.data["cache"], {"ok", "error"})
        self.assertIn("version", response.data)
        self.assertIn("build", response.data)
        self.assertIn("environment", response.data)
        self.assertIn("redis", response.data)