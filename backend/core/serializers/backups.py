from rest_framework import serializers

from core.models import CompanyBackup


class CompanyBackupSerializer(serializers.ModelSerializer):
    download_url = serializers.SerializerMethodField()

    class Meta:
        model = CompanyBackup
        fields = [
            "id",
            "backup_type",
            "status",
            "row_count",
            "created_at",
            "download_url",
        ]

    def get_download_url(self, obj: CompanyBackup) -> str:
        request = self.context.get("request")
        if not request:
            return ""
        return request.build_absolute_uri(f"/api/core/backups/{obj.id}/download/")