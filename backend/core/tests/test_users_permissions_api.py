from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from core.models import Company, Permission, Role, RolePermission, UserRole

User = get_user_model()


class UsersPermissionsApiTests(APITestCase):
    def setUp(self):
        # شركتين
        self.c1 = Company.objects.create(name="C1")
        self.c2 = Company.objects.create(name="C2")

        # users
        self.admin = User.objects.create_user(username="admin", password="pass12345", company=self.c1)
        self.hr = User.objects.create_user(username="hr", password="pass12345", company=self.c1)
        self.other_company_user = User.objects.create_user(username="x", password="pass12345", company=self.c2)

        # roles
        self.admin_role = Role.objects.create(company=self.c1, name="Admin")
        self.hr_role = Role.objects.create(company=self.c1, name="HR")
        UserRole.objects.create(user=self.admin, role=self.admin_role)
        UserRole.objects.create(user=self.hr, role=self.hr_role)

        # permissions rows
        self.p_view = Permission.objects.create(code="users.view", name="View users")
        self.p_create = Permission.objects.create(code="users.create", name="Create users")
        self.p_edit = Permission.objects.create(code="users.edit", name="Edit users")
        self.p_delete = Permission.objects.create(code="users.delete", name="Delete users")

        # admin has all
        RolePermission.objects.create(role=self.admin_role, permission=self.p_view)
        RolePermission.objects.create(role=self.admin_role, permission=self.p_create)
        RolePermission.objects.create(role=self.admin_role, permission=self.p_edit)
        RolePermission.objects.create(role=self.admin_role, permission=self.p_delete)

        # HR has ONLY view (زي الخطة)
        RolePermission.objects.create(role=self.hr_role, permission=self.p_view)

    def auth(self, username):
        url = reverse("token_obtain_pair")
        res = self.client.post(url, {"username": username, "password": "pass12345"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {res.data['access']}")

    def test_admin_can_create_user(self):
        self.auth("admin")
        url = reverse("user-list")  # لازم يكون اسم الراوت في router بتاع UsersViewSet
        res = self.client.post(url, {"username": "new", "password": "pass12345"}, format="json")
        self.assertIn(res.status_code, (status.HTTP_201_CREATED, status.HTTP_200_OK))

    def test_hr_cannot_create_user_403(self):
        self.auth("hr")
        url = reverse("user-list")
        res = self.client.post(url, {"username": "blocked", "password": "pass12345"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_hr_can_list_users_but_only_same_company(self):
        self.auth("hr")
        url = reverse("user-list")
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        usernames = [u["username"] for u in res.data]
        self.assertIn("admin", usernames)
        self.assertIn("hr", usernames)
        self.assertNotIn("x", usernames)  # tenant boundary
