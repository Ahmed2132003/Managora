from drf_spectacular.utils import extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import AuditLog
from core.permissions import HasPermission
from core.serializers.audit import AuditLogSerializer


class AuditLogListView(APIView):
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        return [permission() for permission in self.permission_classes] + [
            HasPermission("audit.view"),
        ]

    @extend_schema(
        tags=["Audit"],
        summary="List audit logs",
        responses={200: AuditLogSerializer(many=True)},
    )
    def get(self, request):
        limit = int(request.query_params.get("limit", 50))
        offset = int(request.query_params.get("offset", 0))

        queryset = (
            AuditLog.objects.filter(company=request.user.company)
            .select_related("actor")
            .order_by("-created_at")
        )
        total = queryset.count()
        logs = queryset[offset : offset + limit]
        serializer = AuditLogSerializer(logs, many=True)
        return Response({"count": total, "results": serializer.data})