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


def _role_names(user) -> set[str]:
    if not user or not getattr(user, "is_authenticated", False):
        return set()
    return {name.strip().lower() for name in user.roles.values_list("name", flat=True)}


@extend_schema_view(
    list=extend_schema(tags=["Users"], summary="List users"),
    retrieve=extend_schema(tags=["Users"], summary="Retrieve user"),
    create=extend_schema(tags=["Users"], summary="Create user"),
    partial_update=extend_schema(tags=["Users"], summary="Update user"),
    destroy=extend_schema(tags=["Users"], summary="Delete user"),
)
class UsersViewSet(PermissionByActionMixin, viewsets.ModelViewSet):
    """
    Users API (multi-tenant).

    قواعد الإنشاء حسب المطلوب:
    - Superuser: يقدر ينشئ لأي شركة + أي Role من الأربع (Manager/HR/Accountant/Employee).
    - Manager (داخل الشركة): يقدر ينشئ HR/Accountant/Employee.
    - HR (داخل الشركة): يقدر ينشئ Accountant/Employee.
    - Accountant/Employee: ممنوع ينشئوا users.
    """

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
        queryset = super().get_queryset()

        # Multi-tenant: non-superuser يرى شركته فقط
        if not self.request.user.is_superuser:
            queryset = queryset.filter(company=self.request.user.company)
        else:
            # superuser optional filter by company id
            company_id = self.request.query_params.get("company")
            if company_id:
                queryset = queryset.filter(company_id=company_id)

        role_id = self.request.query_params.get("role")
        is_active = self.request.query_params.get("is_active")
        search = self.request.query_params.get("search")

        if role_id:
            queryset = queryset.filter(roles__id=role_id)

        if is_active is not None:
            if str(is_active).lower() in {"true", "1", "yes"}:
                queryset = queryset.filter(is_active=True)
            elif str(is_active).lower() in {"false", "0", "no"}:
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

    def _allowed_role_names_for_creator(self, creator) -> set[str]:
        """
        Returns allowed target role names (lowercase) for create/assign.
        """
        if creator.is_superuser:
            return {"manager", "hr", "accountant", "employee"}

        creator_roles = _role_names(creator)
        if "manager" in creator_roles:
            return {"hr", "accountant", "employee"}
        if "hr" in creator_roles:
            return {"accountant", "employee"}
        return set()

    def _ensure_exactly_one_role(self, role_ids):
        if not isinstance(role_ids, list):
            raise PermissionDenied("role_ids must be a list.")
        if len(role_ids) != 1:
            raise PermissionDenied(
                "Assign exactly one role (Manager, HR, Accountant, Employee)."
            )

    def _ensure_roles_allowed(self, creator, roles):
        # roles: list[Role] (already filtered by company)
        if creator.is_superuser:
            return

        allowed = self._allowed_role_names_for_creator(creator)
        if not allowed:
            raise PermissionDenied("You are not allowed to assign roles.")

        invalid = [role for role in roles if role.name.strip().lower() not in allowed]
        if invalid:
            raise PermissionDenied("You are not allowed to assign one or more roles.")

    def perform_create(self, serializer):
        role_ids = serializer.validated_data.pop("role_ids", [])
        company = serializer.validated_data.pop("company", None)
        password = serializer.validated_data.pop("password")

        self._ensure_exactly_one_role(role_ids)

        # company rules
        if self.request.user.is_superuser:
            if company is None:
                raise PermissionDenied("company is required for superuser user creation.")
        else:
            company = self.request.user.company  # ignore any provided company

        # role must belong to the same company
        roles = list(Role.objects.filter(id__in=role_ids, company=company))
        if len(roles) != 1:
            raise PermissionDenied("Role is invalid for this company.")

        # creator rules
        self._ensure_roles_allowed(self.request.user, roles)

        user = serializer.save(company=company)
        user.set_password(password)
        user.save(update_fields=["password"])

        # Assign role (exactly one)
        UserRole.objects.filter(user=user).delete()
        UserRole.objects.bulk_create(
            [UserRole(user=user, role=roles[0])],
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
                "role_id": roles[0].id,
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
            company=user.company,
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
            company=instance.company,
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
        summary="Assign role to user (exactly one role)",
        request={
            "application/json": {
                "type": "object",
                "properties": {"role_ids": {"type": "array", "items": {"type": "integer"}}},
                "required": ["role_ids"],
            }
        },
        responses={200: UserSerializer},
    )
    @action(detail=True, methods=["post"], url_path="roles")
    def assign_roles(self, request, pk=None):
        user = self.get_object()

        role_ids = request.data.get("role_ids", [])
        self._ensure_exactly_one_role(role_ids)

        roles = list(Role.objects.filter(id__in=role_ids, company=user.company))
        if len(roles) != 1:
            return Response(
                {"detail": "Role is invalid for this user's company."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        self._ensure_roles_allowed(request.user, roles)

        UserRole.objects.filter(user=user).delete()
        UserRole.objects.bulk_create(
            [UserRole(user=user, role=roles[0])],
            ignore_conflicts=True,
        )

        AuditLog.objects.create(
            company=user.company,
            actor=request.user,
            action="roles.assign",
            entity="user",
            entity_id=str(user.id),
            payload={"role_id": roles[0].id},
        )

        serializer = UserSerializer(user)
        return Response(serializer.data)

    @extend_schema(
        tags=["Users"],
        summary="Reset user password",
        request={
            "application/json": {
                "type": "object",
                "properties": {"new_password": {"type": "string"}},
                "required": ["new_password"],
            }
        },
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
            company=user.company,
            actor=request.user,
            action="users.reset_password",
            entity="user",
            entity_id=str(user.id),
            payload={"reset_by": request.user.id},
        )
        return Response({"detail": "Password reset successfully."})
