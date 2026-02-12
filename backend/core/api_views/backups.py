from pathlib import Path

from drf_spectacular.utils import extend_schema
from django.http import FileResponse, Http404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import CompanyBackup
from core.permissions import is_admin_user
from core.serializers.backups import CompanyBackupSerializer
from core.services.company_backups import create_company_backup, restore_company_backup


class BackupListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["Backups"], summary="List company backups")
    def get(self, request):
        company = request.user.company
        backups = CompanyBackup.objects.filter(company=company).order_by("-created_at")[:50]
        serializer = CompanyBackupSerializer(backups, many=True, context={"request": request})
        return Response(serializer.data)

    @extend_schema(tags=["Backups"], summary="Create backup now")
    def post(self, request):
        if not (request.user.is_superuser or is_admin_user(request.user)):
            return Response({"detail": "Only managers can create backups."}, status=status.HTTP_403_FORBIDDEN)

        backup = create_company_backup(company=request.user.company, actor=request.user)
        serializer = CompanyBackupSerializer(backup, context={"request": request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class BackupDownloadView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["Backups"], summary="Download backup file")
    def get(self, request, backup_id: int):
        backup = CompanyBackup.objects.filter(id=backup_id, company=request.user.company).first()
        if not backup:
            raise Http404("Backup not found")

        file_path = Path(backup.file_path)
        if not file_path.exists():
            raise Http404("Backup file missing")

        response = FileResponse(file_path.open("rb"), content_type="application/json")
        response["Content-Disposition"] = f'attachment; filename="{file_path.name}"'
        return response


class BackupRestoreView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["Backups"], summary="Restore backup")
    def post(self, request, backup_id: int):
        if not (request.user.is_superuser or is_admin_user(request.user)):
            return Response({"detail": "Only managers can restore backups."}, status=status.HTTP_403_FORBIDDEN)

        backup = CompanyBackup.objects.filter(id=backup_id, company=request.user.company).first()
        if not backup:
            raise Http404("Backup not found")

        restore_company_backup(backup=backup)
        return Response({"detail": "Backup restored successfully."}, status=status.HTTP_200_OK)