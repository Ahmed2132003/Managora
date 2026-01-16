from django.test import TestCase

from core.models import Company, Permission, Role, RolePermission, User, UserRole


class RBACModelTests(TestCase):
    def test_assign_role_permission_to_user(self):
        company = Company.objects.create(name="Acme Inc")
        user = User.objects.create_user(
            username="hr.user",
            email="hr@example.com",
            password="testpass123",
            company=company,
        )
        permission = Permission.objects.create(
            code="users.view",
            name="View users",
        )
        role = Role.objects.create(company=company, name="HR")
        RolePermission.objects.create(role=role, permission=permission)
        UserRole.objects.create(user=user, role=role)

        self.assertEqual(list(user.roles.all()), [role])
        permissions = Permission.objects.filter(roles__users=user).values_list(
            "code", flat=True
        )
        self.assertIn("users.view", list(permissions))