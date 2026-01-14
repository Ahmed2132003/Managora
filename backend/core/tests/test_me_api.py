from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model

from core.models import Company  # عدّل لو مكان Company مختلف

User = get_user_model()

class MeApiTests(APITestCase):
    def setUp(self):
        self.company = Company.objects.create(name="TestCo")
        self.user = User.objects.create_user(
            username="u1",
            password="pass12345",
            company=self.company,
        )

    def test_me_requires_auth(self):
        url = reverse("me")
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_me_returns_user_and_company(self):
        # login
        login_url = reverse("token_obtain_pair")
        login_res = self.client.post(login_url, {"username": "u1", "password": "pass12345"}, format="json")
        self.assertEqual(login_res.status_code, status.HTTP_200_OK)
        access = login_res.data["access"]

        url = reverse("me")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        res = self.client.get(url)

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["user"]["username"], "u1")
        self.assertEqual(res.data["company"]["name"], "TestCo")
