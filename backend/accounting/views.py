from django.db.models import Q
from django.utils.dateparse import parse_date
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounting.models import Account, CostCenter , JournalEntry
from accounting.serializers import (
    AccountSerializer,
    ApplyTemplateSerializer,
    CostCenterSerializer,
    JournalEntryCreateSerializer,
    JournalEntrySerializer,
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
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        permissions = super().get_permissions()
        permissions.append(HasPermission("accounting.manage_coa"))
        return permissions
    
    def post(self, request):
        serializer = ApplyTemplateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = seed_coa_template(
            company=request.user.company,
            template_key=serializer.validated_data["template_key"],
        )
        return Response(result, status=status.HTTP_201_CREATED)


@extend_schema_view(
    list=extend_schema(tags=["Journal Entries"], summary="List journal entries"),
    retrieve=extend_schema(tags=["Journal Entries"], summary="Retrieve journal entry"),
    create=extend_schema(tags=["Journal Entries"], summary="Create journal entry"),
)
class JournalEntryViewSet(PermissionByActionMixin, viewsets.ModelViewSet):
    serializer_class = JournalEntrySerializer
    permission_classes = [IsAuthenticated]
    permission_map = {
        "list": "accounting.journal.view",
        "retrieve": "accounting.journal.view",
        "create": "accounting.journal.post",
        "post_entry": "accounting.journal.post",
    }
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        queryset = (
            JournalEntry.objects.filter(company=self.request.user.company)
            .select_related("created_by")
            .prefetch_related("lines__account", "lines__cost_center")
        )

        date_from = parse_date(self.request.query_params.get("date_from") or "")
        date_to = parse_date(self.request.query_params.get("date_to") or "")
        reference_type = self.request.query_params.get("reference_type")
        search = self.request.query_params.get("search")

        if date_from:
            queryset = queryset.filter(date__gte=date_from)
        if date_to:
            queryset = queryset.filter(date__lte=date_to)
        if reference_type:
            queryset = queryset.filter(reference_type=reference_type)
        if search:
            queryset = queryset.filter(
                Q(memo__icontains=search) | Q(reference_id__icontains=search)
            )

        return queryset.order_by("-date", "-id")

    def get_serializer_class(self):
        if self.action == "create":
            return JournalEntryCreateSerializer
        return JournalEntrySerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        entry = serializer.save()
        output = JournalEntrySerializer(entry, context={"request": request})
        return Response(output.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="post")
    def post_entry(self, request, *args, **kwargs):
        entry = self.get_object()
        if entry.status != JournalEntry.Status.DRAFT:
            return Response(
                {"detail": "Journal entry is already posted."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        entry.status = JournalEntry.Status.POSTED
        entry.save(update_fields=["status"])
        serializer = JournalEntrySerializer(entry, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)