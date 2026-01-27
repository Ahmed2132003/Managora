from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase

from core.models import Company, Permission, Role
from core.permissions import PERMISSION_DEFINITIONS, ROLE_PERMISSION_MAP


class CreateSuperCompanyCommandTests(TestCase):
    def test_createsupercompany_seeds_roles_permissions_and_superuser(self):
        call_command(
            "createsupercompany",
            company="Seed Co",
            username="admin_user",
            email="admin@seed.co",
            password="admin123",
        )

        company = Company.objects.get(name="Seed Co")
        user_model = get_user_model()
        admin_user = user_model.objects.get(username="admin_user")

        self.assertEqual(admin_user.company, company)
        self.assertTrue(admin_user.is_superuser)

        roles = Role.objects.filter(company=company).values_list("name", flat=True)
        for role_name in ROLE_PERMISSION_MAP.keys():
            self.assertIn(role_name, roles)

        for code, name in PERMISSION_DEFINITIONS.items():
            permission = Permission.objects.get(code=code)
            self.assertEqual(permission.name, name)
