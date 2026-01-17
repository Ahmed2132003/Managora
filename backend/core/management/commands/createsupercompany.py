from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

from core.models import Company, Permission, Role, RolePermission, UserRole
from core.permissions import PERMISSION_DEFINITIONS, ROLE_PERMISSION_MAP

class Command(BaseCommand):
    help = "Create initial Company (tenant) and an admin superuser linked to it."

    def add_arguments(self, parser):
        parser.add_argument("--company", type=str, help="Company name")
        parser.add_argument("--username", type=str, help="Admin username")
        parser.add_argument("--email", type=str, help="Admin email")
        parser.add_argument("--password", type=str, help="Admin password")

    def handle(self, *args, **options):
        company_name = options.get("company") or "Demo Company"        
        username = options.get("username") or "admin"
        email = options.get("email") or "admin@example.com"
        password = options.get("password") or "admin123"

        # 1) Create or reuse company (MVP: single company)
        if Company.objects.exists():
            company = Company.objects.first()            
            self.stdout.write(self.style.WARNING(
                f"Company already exists. Using: {company.name} (id={company.id})"
            ))
        else:
            company = Company.objects.create(name=company_name, is_active=True)
            self.stdout.write(self.style.SUCCESS(
                f"Company created: {company.name} (id={company.id})"
            ))

        # 2) Create or reuse admin user
        User = get_user_model()
        
        if User.objects.filter(username=username).exists():
            user = User.objects.get(username=username)
            # ensure linked to company
            if getattr(user, "company_id", None) != company.id:
                user.company = company
                user.save(update_fields=["company"])
                self.stdout.write(self.style.WARNING(
                    f"User '{username}' existed but was re-linked to company '{company.name}'."
                ))
            else:
                self.stdout.write(self.style.WARNING(
                    f"User '{username}' already exists. Skipping creation."
                ))
        else:
            user = User.objects.create_superuser(
                username=username,
                email=email,
                password=password,
                company=company,   # ← السطر المهم
            )
            user.is_staff = True
            user.is_superuser = True
            self.stdout.write(self.style.SUCCESS(
                f"Admin user created: {username}"
            ))

        # 3) Seed permissions
        permission_objects = {}
        for code, name in PERMISSION_DEFINITIONS.items():
            permission, _ = Permission.objects.get_or_create(
                code=code,
                defaults={"name": name},
            )
            if permission.name != name:
                permission.name = name
                permission.save(update_fields=["name"])
            permission_objects[code] = permission

        # 4) Seed roles and attach permissions
        role_objects = {}
        for role_name in ROLE_PERMISSION_MAP.keys():
            role, _ = Role.objects.get_or_create(
                company=company,
                name=role_name,
            )
            role_objects[role_name] = role

        for role_name, permission_codes in ROLE_PERMISSION_MAP.items():
            role = role_objects[role_name]
            RolePermission.objects.filter(role=role).exclude(
                permission__code__in=permission_codes
            ).delete()
            for code in permission_codes:
                permission = permission_objects.get(code)
                if permission is None:
                    continue
                RolePermission.objects.get_or_create(
                    role=role,
                    permission=permission,
                )

        # 5) Assign Admin role to admin user
        admin_role = role_objects.get("Admin")
        if admin_role:
            UserRole.objects.get_or_create(user=user, role=admin_role)

        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("Seed completed ✅"))        
        self.stdout.write("Login with:")
        self.stdout.write(f"  username: {username}")
        self.stdout.write(f"  password: {password}")
