from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from django.db.models import Q

from core.models import AuditLog, Role, User, UserRole
from core.permissions import PermissionByActionMixin
from core.serializers.users import (
    UserCreateSerializer,
    UserSerializer,
    UserUpdateSerializer,
)


@extend_schema_view(
    list=extend_schema(tags=["Users"], summary="List users"),
    retrieve=extend_schema(tags=["Users"], summary="Retrieve user"),
    create=extend_schema(tags=["Users"], summary="Create user"),
    partial_update=extend_schema(tags=["Users"], summary="Update user"),
    destroy=extend_schema(tags=["Users"], summary="Delete user"),
)
class UsersViewSet(PermissionByActionMixin, viewsets.ModelViewSet):
    queryset = User.objects.select_related("company").prefetch_related("roles")
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    permission_map = {
        "list": "users.view",
        "retrieve": "users.view",
        "create": "users.create",
        "partial_update": "users.edit",
        "destroy": "users.delete",
        "assign_roles": "users.edit",
    }

    def get_queryset(self):
        queryset = super().get_queryset().filter(company=self.request.user.company)
        role_id = self.request.query_params.get("role")
        is_active = self.request.query_params.get("is_active")
        search = self.request.query_params.get("search")

        if role_id:
            queryset = queryset.filter(roles__id=role_id)
        if is_active is not None:
            if is_active.lower() in {"true", "1", "yes"}:
                queryset = queryset.filter(is_active=True)
            elif is_active.lower() in {"false", "0", "no"}:
                queryset = queryset.filter(is_active=False)
        if search:
            queryset = queryset.filter(
                Q(username__icontains=search) | Q(email__icontains=search)
            )

        return queryset.distinct().order_by("id")

    def get_serializer_class(self):
        if self.action == "create":
            return UserCreateSerializer
        if self.action == "partial_update":
            return UserUpdateSerializer
        return UserSerializer

    def perform_create(self, serializer):
        password = serializer.validated_data.pop("password")
        user = serializer.save(company=self.request.user.company)
        user.set_password(password)
        user.save(update_fields=["password"])
        AuditLog.objects.create(
            company=self.request.user.company,
            actor=self.request.user,
            action="users.create",
            entity="user",
            entity_id=str(user.id),
            payload={
                "username": user.username,
                "email": user.email,
                "is_active": user.is_active,
            },
        )

    def perform_update(self, serializer):
        password = serializer.validated_data.pop("password", None)
        user = serializer.save()
        if password:
            user.set_password(password)
            user.save(update_fields=["password"])
        AuditLog.objects.create(
            company=self.request.user.company,
            actor=self.request.user,
            action="users.update",
            entity="user",
            entity_id=str(user.id),
            payload={"updated_fields": list(serializer.validated_data.keys())},
        )

    def perform_destroy(self, instance):
        AuditLog.objects.create(
            company=self.request.user.company,
            actor=self.request.user,
            action="users.delete",
            entity="user",
            entity_id=str(instance.id),
            payload={"username": instance.username},
        )
        super().perform_destroy(instance)
        
    @extend_schema(
        tags=["Users"],
        summary="Assign roles to user",
        request={"application/json": {"type": "object", "properties": {"role_ids": {"type": "array", "items": {"type": "integer"}}}, "required": ["role_ids"]}},
        responses={200: UserSerializer},
    )
    @action(detail=True, methods=["post"], url_path="roles")
    def assign_roles(self, request, pk=None):
        user = self.get_object()
        role_ids = request.data.get("role_ids", [])
        if not isinstance(role_ids, list):
            return Response(
                {"detail": "role_ids must be a list."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        roles = Role.objects.filter(id__in=role_ids, company=request.user.company)
        if len(role_ids) != roles.count():
            return Response(
                {"detail": "One or more roles are invalid for this company."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        UserRole.objects.filter(user=user).delete()
        UserRole.objects.bulk_create(
            [UserRole(user=user, role=role) for role in roles],
            ignore_conflicts=True,
        )
        AuditLog.objects.create(
            company=request.user.company,
            actor=request.user,
            action="roles.assign",
            entity="user",
            entity_id=str(user.id),
            payload={"role_ids": [role.id for role in roles]},
        )

        serializer = UserSerializer(user)
        return Response(serializer.data)