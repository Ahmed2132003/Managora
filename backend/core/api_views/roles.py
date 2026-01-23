from drf_spectacular.utils import extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from core.models import Role
from core.permissions import is_admin_user
from core.serializers.roles import RoleSerializer


class RoleListView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Roles"],
        summary="List roles",
        description="Return roles for the authenticated user's company (Admin only).",
        responses={200: RoleSerializer(many=True)},
    )
    def get(self, request):
        if not is_admin_user(request.user):
            return Response({"detail": "You do not have permission to perform this action."}, status=status.HTTP_403_FORBIDDEN)

        roles = (
            Role.objects.filter(company=request.user.company)
            .prefetch_related("permissions")
            .order_by("name")
        )
        serializer = RoleSerializer(roles, many=True)
        return Response(serializer.data)