from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from django.db.models import Q

from django.forms.models import model_to_dict

from core.audit import get_audit_context
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
        "reset_password": "users.reset_password",
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

    def _allowed_role_names(self, user):
        if user.is_superuser:
            return None

        role_names = {name.lower() for name in user.roles.values_list("name", flat=True)}
        if "manager" in role_names:
            return {"hr", "accountant", "employee"}
        if "hr" in role_names:
            return {"accountant", "employee"}
        return set()

    def _ensure_roles_allowed(self, roles):
        allowed = self._allowed_role_names(self.request.user)
        if allowed is None:
            return
        if not allowed:
            raise PermissionDenied("You are not allowed to assign roles.")

        invalid = [role for role in roles if role.name.lower() not in allowed]
        if invalid:
            raise PermissionDenied("You are not allowed to assign one or more roles.")

    def perform_create(self, serializer):
        role_ids = serializer.validated_data.pop("role_ids", [])
        company = serializer.validated_data.pop("company", None)
        password = serializer.validated_data.pop("password")
        if not self.request.user.is_superuser:
            company = self.request.user.company

        roles = Role.objects.filter(id__in=role_ids, company=company)
        if role_ids and len(role_ids) != roles.count():
            raise PermissionDenied("One or more roles are invalid for this company.")
        if roles:
            self._ensure_roles_allowed(list(roles))

        user = serializer.save(company=company)
        user.set_password(password)
        user.save(update_fields=["password"])
        if roles:
            UserRole.objects.bulk_create(
                [UserRole(user=user, role=role) for role in roles],
                ignore_conflicts=True,
            )
        audit_context = get_audit_context()
        AuditLog.objects.create(
            company=company,
            actor=self.request.user,
            action="users.create",
            entity="user",
            entity_id=str(user.id),
            before={},            
            after=model_to_dict(user, fields=["id", "username", "email", "is_active"]),
            payload={
                "username": user.username,
                "email": user.email,
                "is_active": user.is_active,
            },
            ip_address=audit_context.ip_address if audit_context else None,
            user_agent=audit_context.user_agent if audit_context else "",
        )

    def perform_update(self, serializer):
        before_data = model_to_dict(
            serializer.instance,
            fields=["id", "username", "email", "is_active"],
        )
        password = serializer.validated_data.pop("password", None)
        user = serializer.save()
        if password:
            user.set_password(password)
            user.save(update_fields=["password"])
        audit_context = get_audit_context()
        AuditLog.objects.create(
            company=self.request.user.company,
            actor=self.request.user,
            action="users.update",
            entity="user",
            entity_id=str(user.id),
            before=before_data,
            after=model_to_dict(user, fields=["id", "username", "email", "is_active"]),
            payload={"updated_fields": list(serializer.validated_data.keys())},
            ip_address=audit_context.ip_address if audit_context else None,
            user_agent=audit_context.user_agent if audit_context else "",
        )

    def perform_destroy(self, instance):
        audit_context = get_audit_context()
        AuditLog.objects.create(
            company=self.request.user.company,
            actor=self.request.user,
            action="users.delete",
            entity="user",
            entity_id=str(instance.id),
            before=model_to_dict(instance, fields=["id", "username", "email", "is_active"]),
            after={},
            payload={"username": instance.username},
            ip_address=audit_context.ip_address if audit_context else None,
            user_agent=audit_context.user_agent if audit_context else "",
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
        self._ensure_roles_allowed(list(roles))
        
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

    @extend_schema(
        tags=["Users"],
        summary="Reset user password",
        request={"application/json": {"type": "object", "properties": {"new_password": {"type": "string"}}, "required": ["new_password"]}},
        responses={200: {"type": "object", "properties": {"detail": {"type": "string"}}}},
    )
    @action(detail=True, methods=["post"], url_path="reset-password")
    def reset_password(self, request, pk=None):
        user = self.get_object()
        new_password = request.data.get("new_password")
        if not new_password:
            return Response(
                {"detail": "new_password is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(new_password)
        user.save(update_fields=["password"])
        AuditLog.objects.create(
            company=request.user.company,
            actor=request.user,
            action="users.reset_password",
            entity="user",
            entity_id=str(user.id),
            payload={"reset_by": request.user.id},
        )
        return Response({"detail": "Password reset successfully."})