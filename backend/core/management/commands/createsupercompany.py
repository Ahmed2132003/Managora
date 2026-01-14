from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

from core.models import Company


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

        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("Seed completed ✅"))
        self.stdout.write("Login with:")
        self.stdout.write(f"  username: {username}")
        self.stdout.write(f"  password: {password}")
