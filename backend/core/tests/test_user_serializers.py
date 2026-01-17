from django.contrib.auth import get_user_model
from rest_framework.test import APIRequestFactory, APITestCase

from core.models import Company
from core.serializers.users import UserCreateSerializer, UserUpdateSerializer

User = get_user_model()


class UserSerializerValidationTests(APITestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.company = Company.objects.create(name="Acme")
        self.other_company = Company.objects.create(name="Other")
        self.admin = User.objects.create_user(
            username="admin",
            password="pass12345",
            company=self.company,
            email="admin@example.com",
        )
        self.other = User.objects.create_user(
            username="other",
            password="pass12345",
            company=self.company,
            email="other@example.com",
        )
        self.external = User.objects.create_user(
            username="external",
            password="pass12345",
            company=self.other_company,
            email="shared@example.com",
        )

    def test_create_rejects_duplicate_email_in_company(self):
        request = self.factory.post("/api/users/")
        request.user = self.admin
        serializer = UserCreateSerializer(
            data={
                "username": "new-user",
                "email": "other@example.com",
                "password": "pass12345",
                "is_active": True,
            },
            context={"request": request},
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn("email", serializer.errors)

    def test_create_allows_same_email_in_other_company(self):
        request = self.factory.post("/api/users/")
        request.user = self.admin
        serializer = UserCreateSerializer(
            data={
                "username": "new-user",
                "email": "shared@example.com",
                "password": "pass12345",
                "is_active": True,
            },
            context={"request": request},
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_update_rejects_duplicate_email_in_company(self):
        request = self.factory.patch(f"/api/users/{self.other.id}/")
        request.user = self.admin
        serializer = UserUpdateSerializer(
            instance=self.other,
            data={"email": "admin@example.com"},
            partial=True,
            context={"request": request},
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn("email", serializer.errors)

    def test_update_allows_same_email_for_self(self):
        request = self.factory.patch(f"/api/users/{self.admin.id}/")
        request.user = self.admin
        serializer = UserUpdateSerializer(
            instance=self.admin,
            data={"email": "admin@example.com"},
            partial=True,
            context={"request": request},
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)