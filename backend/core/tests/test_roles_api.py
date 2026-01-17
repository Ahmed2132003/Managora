from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from core.models import Company, Permission, Role, RolePermission, UserRole

User = get_user_model()


class RolesApiTests(APITestCase):
    def setUp(self):
        self.company = Company.objects.create(name="TestCo")
        self.admin = User.objects.create_user(
            username="admin",
            password="pass12345",
            company=self.company,
        )
        self.hr = User.objects.create_user(
            username="hr",
            password="pass12345",
            company=self.company,
        )

        self.admin_role = Role.objects.create(company=self.company, name="Admin")
        self.hr_role = Role.objects.create(company=self.company, name="HR")
        UserRole.objects.create(user=self.admin, role=self.admin_role)
        UserRole.objects.create(user=self.hr, role=self.hr_role)

        self.permission = Permission.objects.create(
            code="users.view",
            name="View users",
        )
        RolePermission.objects.create(role=self.hr_role, permission=self.permission)

    def authenticate(self, username):
        login_url = reverse("token_obtain_pair")
        res = self.client.post(
            login_url,
            {"username": username, "password": "pass12345"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {res.data['access']}")

    def test_roles_list_admin_only(self):
        self.authenticate("admin")
        url = reverse("roles")
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data[0]["name"], "Admin")

        self.authenticate("hr")
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_roles_list_includes_permissions(self):
        self.authenticate("admin")
        url = reverse("roles")
        res = self.client.get(url)
        hr_role = next(role for role in res.data if role["name"] == "HR")
        self.assertIn("users.view", hr_role["permissions"])