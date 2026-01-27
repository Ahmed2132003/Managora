from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from core.models import AuditLog, Company, Permission, Role, RolePermission, UserRole

User = get_user_model()


class AuditLogTests(APITestCase):
    def setUp(self):
        self.company = Company.objects.create(name="Audit Co")
        self.manager = User.objects.create_user(
            username="manager",
            password="pass12345",
            company=self.company,
        )
        self.manager_role = Role.objects.create(company=self.company, name="Manager")
        self.employee_role = Role.objects.create(company=self.company, name="Employee")
        UserRole.objects.create(user=self.manager, role=self.manager_role)

        permissions = [
            Permission.objects.create(code="users.create", name="Create users"),
        ]
        RolePermission.objects.create(role=self.manager_role, permission=permissions[0])

    def authenticate(self):
        url = reverse("token_obtain_pair")
        response = self.client.post(
            url,
            {"username": "manager", "password": "pass12345"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access']}")

    def test_audit_log_created_on_user_create(self):
        self.authenticate()
        url = reverse("user-list")
        response = self.client.post(
            url,
            {
                "username": "new-user",
                "password": "pass12345",
                "role_ids": [self.employee_role.id],
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        log = AuditLog.objects.filter(action="users.create").first()
        self.assertIsNotNone(log)
        self.assertEqual(log.company, self.company)
        self.assertEqual(log.actor, self.manager)
        self.assertEqual(log.entity, "user")
        self.assertEqual(log.payload.get("username"), "new-user")
