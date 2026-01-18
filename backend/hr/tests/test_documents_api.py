import shutil
import tempfile

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from core.models import Company, Permission, Role, RolePermission, UserRole
from hr.models import Employee, EmployeeDocument

User = get_user_model()


@override_settings(MEDIA_ROOT=tempfile.mkdtemp())
class EmployeeDocumentApiTests(APITestCase):
    def setUp(self):
        self.addCleanup(shutil.rmtree, settings.MEDIA_ROOT, ignore_errors=True)
        self.c1 = Company.objects.create(name="C1")
        self.c2 = Company.objects.create(name="C2")

        self.hr_user = User.objects.create_user(
            username="hr",
            password="pass12345",
            company=self.c1,
        )
        self.manager_user = User.objects.create_user(
            username="manager",
            password="pass12345",
            company=self.c1,
        )
        self.other_user = User.objects.create_user(
            username="other",
            password="pass12345",
            company=self.c2,
        )

        self.hr_role = Role.objects.create(company=self.c1, name="HR")
        self.manager_role = Role.objects.create(company=self.c1, name="Manager")
        self.other_role = Role.objects.create(company=self.c2, name="HR")
        UserRole.objects.create(user=self.hr_user, role=self.hr_role)
        UserRole.objects.create(user=self.manager_user, role=self.manager_role)
        UserRole.objects.create(user=self.other_user, role=self.other_role)

        permissions = {
            code: Permission.objects.create(code=code, name=code)
            for code in [
                "hr.employees.view",
                "hr.employees.edit",
                "hr.documents.view",
                "hr.documents.create",
                "hr.documents.delete",
            ]
        }
        RolePermission.objects.create(
            role=self.hr_role, permission=permissions["hr.employees.edit"]
        )
        RolePermission.objects.create(
            role=self.hr_role, permission=permissions["hr.documents.create"]
        )
        RolePermission.objects.create(
            role=self.hr_role, permission=permissions["hr.documents.delete"]
        )
        RolePermission.objects.create(
            role=self.hr_role, permission=permissions["hr.documents.view"]
        )
        RolePermission.objects.create(
            role=self.manager_role, permission=permissions["hr.employees.view"]
        )
        RolePermission.objects.create(
            role=self.other_role, permission=permissions["hr.documents.view"]
        )

        self.employee = Employee.objects.create(
            company=self.c1,
            employee_code="EMP-1",
            full_name="Alice Smith",
            hire_date="2022-01-01",
            status=Employee.Status.ACTIVE,
        )
        self.other_employee = Employee.objects.create(
            company=self.c2,
            employee_code="EMP-2",
            full_name="Other",
            hire_date="2022-02-01",
            status=Employee.Status.ACTIVE,
        )

    def auth(self, username):
        url = reverse("token_obtain_pair")
        res = self.client.post(
            url, {"username": username, "password": "pass12345"}, format="json"
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {res.data['access']}")

    def test_upload_and_list_documents(self):
        self.auth("hr")
        url = reverse("employee-documents", kwargs={"employee_id": self.employee.id})
        upload = SimpleUploadedFile(
            "contract.pdf", b"contract-content", content_type="application/pdf"
        )
        res = self.client.post(
            url,
            {"doc_type": "contract", "title": "Main contract", "file": upload},
            format="multipart",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]["doc_type"], "contract")

    def test_upload_blocked_for_deleted_employee(self):
        self.auth("hr")
        self.employee.delete()
        url = reverse("employee-documents", kwargs={"employee_id": self.employee.id})
        upload = SimpleUploadedFile(
            "contract.pdf", b"contract-content", content_type="application/pdf"
        )
        res = self.client.post(
            url,
            {"doc_type": "contract", "file": upload},
            format="multipart",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_download_requires_company_access(self):
        document = EmployeeDocument.objects.create(
            company=self.c1,
            employee=self.employee,
            doc_type=EmployeeDocument.DocumentType.ID,
            file=SimpleUploadedFile(
                "id.pdf", b"id-content", content_type="application/pdf"
            ),
            uploaded_by=self.hr_user,
        )

        self.auth("manager")
        download_url = reverse(
            "employee-document-download", kwargs={"pk": document.id}
        )
        res = self.client.get(download_url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        self.auth("other")
        res = self.client.get(download_url)
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)