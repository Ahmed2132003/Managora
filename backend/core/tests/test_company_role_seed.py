from django.test import TestCase

from core.models import Company, Permission, Role, RolePermission
from core.permissions import ROLE_PERMISSION_MAP


class CompanyRoleSeedTests(TestCase):
    def test_company_creation_seeds_core_roles_and_permissions(self):
        company = Company.objects.create(name="RoleSeed Co")

        expected_roles = {"Manager", "HR", "Accountant", "Employee"}
        roles = set(Role.objects.filter(company=company).values_list("name", flat=True))
        self.assertEqual(roles, expected_roles)

        for role_name in expected_roles:
            role = Role.objects.get(company=company, name=role_name)
            expected_codes = set(ROLE_PERMISSION_MAP[role_name])
            attached_codes = set(
                Permission.objects.filter(roles=role).values_list("code", flat=True)
            )
            self.assertEqual(attached_codes, expected_codes)
            self.assertEqual(
                RolePermission.objects.filter(role=role).count(),
                len(expected_codes),
            )