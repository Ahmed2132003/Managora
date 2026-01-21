from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounting.models import Account, CostCenter
from accounting.serializers import (
    AccountSerializer,
    ApplyTemplateSerializer,
    CostCenterSerializer,
)
from accounting.services.seed import seed_coa_template
from core.permissions import HasPermission, PermissionByActionMixin


@extend_schema_view(
    list=extend_schema(tags=["Accounts"], summary="List accounts"),
    retrieve=extend_schema(tags=["Accounts"], summary="Retrieve account"),
    create=extend_schema(tags=["Accounts"], summary="Create account"),
    partial_update=extend_schema(tags=["Accounts"], summary="Update account"),
)
class AccountViewSet(PermissionByActionMixin, viewsets.ModelViewSet):
    serializer_class = AccountSerializer
    permission_classes = [IsAuthenticated]
    permission_map = {
        "list": "accounting.view",
        "retrieve": "accounting.view",
        "create": "accounting.manage_coa",
        "partial_update": "accounting.manage_coa",
        "update": "accounting.manage_coa",
        "destroy": "accounting.manage_coa",
    }

    def get_queryset(self):
        return Account.objects.filter(company=self.request.user.company)

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)


@extend_schema_view(
    list=extend_schema(tags=["Cost Centers"], summary="List cost centers"),
    retrieve=extend_schema(tags=["Cost Centers"], summary="Retrieve cost center"),
    create=extend_schema(tags=["Cost Centers"], summary="Create cost center"),
    partial_update=extend_schema(tags=["Cost Centers"], summary="Update cost center"),
)
class CostCenterViewSet(PermissionByActionMixin, viewsets.ModelViewSet):
    serializer_class = CostCenterSerializer
    permission_classes = [IsAuthenticated]
    permission_map = {
        "list": "accounting.view",
        "retrieve": "accounting.view",
        "create": "accounting.manage_coa",
        "partial_update": "accounting.manage_coa",
        "update": "accounting.manage_coa",
        "destroy": "accounting.manage_coa",
    }

    def get_queryset(self):
        return CostCenter.objects.filter(company=self.request.user.company)

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)


@extend_schema(tags=["Chart of Accounts"], summary="Apply COA template")
class ApplyTemplateView(APIView):
    permission_classes = [IsAuthenticated, HasPermission("accounting.manage_coa")]

    def post(self, request):
        serializer = ApplyTemplateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = seed_coa_template(
            company=request.user.company,
            template_key=serializer.validated_data["template_key"],
        )
        return Response(result, status=status.HTTP_201_CREATED)