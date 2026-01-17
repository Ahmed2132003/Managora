from drf_spectacular.utils import extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from core.models import Permission
from core.serializers.me import MeSerializer


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Auth"],
        summary="Current user profile",
        description="Return the authenticated user, their company, roles, and permissions.",
        responses={200: MeSerializer},
    )
    def get(self, request):
        user = request.user
        company = getattr(user, "company", None)

        if company is None:
            return Response({"detail": "User is not linked to a company."}, status=status.HTTP_400_BAD_REQUEST)

        roles = user.roles.order_by("name")
        permissions = (
            Permission.objects.filter(roles__users=user)
            .values_list("code", flat=True)
            .distinct()
            .order_by("code")
        )

        data = {
            "user": user,
            "company": company,
            "roles": roles,
            "permissions": list(permissions),
        }
        serializer = MeSerializer(data)
        return Response(serializer.data)