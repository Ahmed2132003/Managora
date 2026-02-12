from drf_spectacular.utils import OpenApiParameter, extend_schema
from django.db.models import Q
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
        parameters=[
            OpenApiParameter(name="limit", type=int, location=OpenApiParameter.QUERY),
            OpenApiParameter(name="offset", type=int, location=OpenApiParameter.QUERY),
            OpenApiParameter(name="action_type", type=str, location=OpenApiParameter.QUERY),
            OpenApiParameter(name="entity", type=str, location=OpenApiParameter.QUERY),
            OpenApiParameter(name="q", type=str, location=OpenApiParameter.QUERY),
        ],
        responses={200: AuditLogSerializer(many=True)},
    )
    def get(self, request):
        limit = int(request.query_params.get("limit", 50))
        offset = int(request.query_params.get("offset", 0))
        action_type = request.query_params.get("action_type", "").strip().lower()
        entity = request.query_params.get("entity", "").strip().lower()
        query = request.query_params.get("q", "").strip()

        queryset = (
            AuditLog.objects.filter(company=request.user.company)
            .select_related("actor")
            .order_by("-created_at")
        )

        if action_type:
            queryset = queryset.filter(action__iendswith=f".{action_type}")
        if entity:
            queryset = queryset.filter(entity__iexact=entity)
        if query:
            queryset = queryset.filter(
                Q(actor__username__icontains=query)
                | Q(action__icontains=query)
                | Q(entity__icontains=query)
                | Q(entity_id__icontains=query)
            )
        total = queryset.count()
        logs = queryset[offset : offset + limit]
        serializer = AuditLogSerializer(logs, many=True)
        return Response({"count": total, "results": serializer.data})