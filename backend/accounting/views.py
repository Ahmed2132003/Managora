from django.db.models import Q
from django.utils.dateparse import parse_date
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounting.models import Account, AccountMapping, CostCenter, Expense, JournalEntry

from accounting.serializers import (
    AccountSerializer,
    ApplyTemplateSerializer,
    CostCenterSerializer,
    ExpenseAttachmentCreateSerializer,
    ExpenseAttachmentSerializer,
    ExpenseSerializer,
    JournalEntryCreateSerializer,
    JournalEntrySerializer,
)
from accounting.services.expenses import ensure_expense_journal_entry
from accounting.services.seed import seed_coa_template
from core.permissions import HasPermission, PermissionByActionMixin, user_has_permission


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



@extend_schema_view(
    list=extend_schema(tags=["Account Mapping"], summary="List account mappings"),
    retrieve=extend_schema(tags=["Account Mapping"], summary="Retrieve account mapping"),
    create=extend_schema(tags=["Account Mapping"], summary="Create account mapping"),
    partial_update=extend_schema(tags=["Account Mapping"], summary="Update account mapping"),
)
class AccountMappingViewSet(PermissionByActionMixin, viewsets.ModelViewSet):
    serializer_class = AccountMappingSerializer
    permission_classes = [IsAuthenticated]
    permission_map = {
        "list": "accounting.view",
        "retrieve": "accounting.view",
        "create": "accounting.manage_coa",
        "partial_update": "accounting.manage_coa",
        "update": "accounting.manage_coa",
        "bulk_set": "accounting.manage_coa",
    }

    def get_queryset(self):
        return AccountMapping.objects.filter(company=self.request.user.company).select_related(
            "account"
        )

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)

    @action(detail=False, methods=["post"], url_path="bulk-set")
    def bulk_set(self, request):
        serializer = AccountMappingBulkSetSerializer(data={"mappings": request.data})
        serializer.is_valid(raise_exception=True)
        mappings = serializer.validated_data["mappings"]
        company = request.user.company

        account_ids = {account_id for account_id in mappings.values() if account_id}
        accounts = {
            account.id: account
            for account in Account.objects.filter(company=company, id__in=account_ids)
        }
        if len(accounts) != len(account_ids):
            return Response(
                {"detail": "Account must belong to the same company."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        updated = []
        for key, account_id in mappings.items():
            required = key in AccountMapping.REQUIRED_KEYS
            account = accounts.get(account_id) if account_id else None
            if required and not account:
                return Response(
                    {"detail": f"Mapping {key} is required."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            mapping, _ = AccountMapping.objects.update_or_create(
                company=company,
                key=key,
                defaults={"account": account, "required": required},
            )
            updated.append(mapping)

        output = AccountMappingSerializer(updated, many=True, context={"request": request})
        return Response(output.data, status=status.HTTP_200_OK)


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


@extend_schema_view(
    list=extend_schema(tags=["Expenses"], summary="List expenses"),
    retrieve=extend_schema(tags=["Expenses"], summary="Retrieve expense"),
    create=extend_schema(tags=["Expenses"], summary="Create expense"),
    partial_update=extend_schema(tags=["Expenses"], summary="Update expense"),
)
class ExpenseViewSet(PermissionByActionMixin, viewsets.ModelViewSet):
    serializer_class = ExpenseSerializer
    permission_classes = [IsAuthenticated]
    permission_map = {
        "list": "expenses.view",
        "retrieve": "expenses.view",
        "create": "expenses.create",
        "partial_update": "expenses.create",
        "update": "expenses.create",
        "approve": "expenses.approve",
        "attachments": "expenses.create",
    }

    def get_queryset(self):
        queryset = Expense.objects.filter(company=self.request.user.company)
        date_from = parse_date(self.request.query_params.get("date_from") or "")
        date_to = parse_date(self.request.query_params.get("date_to") or "")
        vendor = self.request.query_params.get("vendor")
        amount_min = self.request.query_params.get("amount_min")
        amount_max = self.request.query_params.get("amount_max")

        if date_from:
            queryset = queryset.filter(date__gte=date_from)
        if date_to:
            queryset = queryset.filter(date__lte=date_to)
        if vendor:
            queryset = queryset.filter(vendor_name__icontains=vendor)
        if amount_min:
            queryset = queryset.filter(amount__gte=amount_min)
        if amount_max:
            queryset = queryset.filter(amount__lte=amount_max)
        return queryset.order_by("-date", "-id")

    def perform_create(self, serializer):
        status_value = serializer.validated_data.get("status", Expense.Status.DRAFT)
        if status_value == Expense.Status.APPROVED and not user_has_permission(
            self.request.user, "expenses.approve"
        ):
            raise PermissionError("You do not have permission to approve expenses.")
        expense = serializer.save(company=self.request.user.company, created_by=self.request.user)
        if expense.status == Expense.Status.APPROVED:
            ensure_expense_journal_entry(expense)

    def perform_update(self, serializer):
        expense = self.get_object()
        if expense.status == Expense.Status.APPROVED:
            raise PermissionError("Approved expenses cannot be edited.")
        status_value = serializer.validated_data.get("status", expense.status)
        if status_value == Expense.Status.APPROVED and not user_has_permission(
            self.request.user, "expenses.approve"
        ):
            raise PermissionError("You do not have permission to approve expenses.")
        expense = serializer.save()
        if expense.status == Expense.Status.APPROVED:
            ensure_expense_journal_entry(expense)

    def handle_exception(self, exc):
        if isinstance(exc, PermissionError):
            return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)
        return super().handle_exception(exc)

    @action(detail=True, methods=["post"])
    def approve(self, request, *args, **kwargs):
        expense = self.get_object()
        if expense.status == Expense.Status.APPROVED:
            return Response(
                {"detail": "Expense is already approved."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        expense.status = Expense.Status.APPROVED
        expense.save(update_fields=["status"])
        ensure_expense_journal_entry(expense)
        serializer = ExpenseSerializer(expense, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="attachments")
    def attachments(self, request, *args, **kwargs):
        expense = self.get_object()
        serializer = ExpenseAttachmentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        attachment = serializer.save(
            expense=expense,
            uploaded_by=request.user,
        )
        output = ExpenseAttachmentSerializer(attachment, context={"request": request})
        return Response(output.data, status=status.HTTP_201_CREATED)