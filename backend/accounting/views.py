from decimal import Decimal

from django.db.models import Q, Sum, Value, DecimalField
from django.db.models.functions import Coalesce
from django.utils.dateparse import parse_date
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounting.models import Account, AccountMapping, CostCenter, Customer, Expense, JournalEntry, JournalLine

from accounting.serializers import (
    AccountSerializer,
    AccountMappingBulkSetSerializer,
    AccountMappingSerializer,
    ApplyTemplateSerializer,
    CostCenterSerializer,
    CustomerSerializer,
    ExpenseAttachmentCreateSerializer,
    ExpenseAttachmentSerializer,
    ExpenseSerializer,
    JournalEntryCreateSerializer,
    JournalEntrySerializer,
)
from accounting.services.expenses import ensure_expense_journal_entry
from accounting.services.seed import seed_coa_template
from core.permissions import HasPermission, PermissionByActionMixin, user_has_permission


def _format_amount(value):
    if value is None:
        value = Decimal("0")
    return f"{Decimal(value):.2f}"


def _parse_date_param(request, param_name):
    value = request.query_params.get(param_name)
    if not value:
        return None
    return parse_date(value)



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
    list=extend_schema(tags=["Customers"], summary="List customers"),
    retrieve=extend_schema(tags=["Customers"], summary="Retrieve customer"),
    create=extend_schema(tags=["Customers"], summary="Create customer"),
    partial_update=extend_schema(tags=["Customers"], summary="Update customer"),
)
class CustomerViewSet(PermissionByActionMixin, viewsets.ModelViewSet):
    serializer_class = CustomerSerializer
    permission_classes = [IsAuthenticated]
    permission_map = {
        "list": "customers.view",
        "retrieve": "customers.view",
        "create": "customers.create",
        "partial_update": "customers.edit",
        "update": "customers.edit",
        "destroy": "customers.edit",
    }

    def get_queryset(self):
        queryset = Customer.objects.filter(company=self.request.user.company)
        name = self.request.query_params.get("name")
        code = self.request.query_params.get("code")
        is_active = self.request.query_params.get("is_active")

        if name:
            queryset = queryset.filter(name__icontains=name)
        if code:
            queryset = queryset.filter(code__icontains=code)
        if is_active is not None and is_active != "":
            if is_active.lower() in {"true", "1", "yes"}:
                queryset = queryset.filter(is_active=True)
            elif is_active.lower() in {"false", "0", "no"}:
                queryset = queryset.filter(is_active=False)
        return queryset.order_by("code", "id")

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=["is_active"])


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


@extend_schema(tags=["Reports"], summary="Trial balance")
class TrialBalanceView(APIView):
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        permissions = super().get_permissions()
        permissions.append(HasPermission("accounting.reports.view"))
        return permissions

    def get(self, request):
        date_from = _parse_date_param(request, "date_from")
        date_to = _parse_date_param(request, "date_to")
        if not date_from or not date_to:
            return Response(
                {"detail": "date_from and date_to are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if date_from > date_to:
            return Response(
                {"detail": "date_from must be before date_to."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        lines = (
            JournalLine.objects.filter(
                company=request.user.company,
                entry__status=JournalEntry.Status.POSTED,
                entry__date__gte=date_from,
                entry__date__lte=date_to,
            )
            .values("account_id", "account__code", "account__name", "account__type")
            .annotate(
                debit=Coalesce(
                    Sum("debit"), Value(0), output_field=DecimalField(max_digits=14, decimal_places=2)
                ),
                credit=Coalesce(
                    Sum("credit"), Value(0), output_field=DecimalField(max_digits=14, decimal_places=2)
                ),
            )
            .order_by("account__code")
        )

        data = [
            {
                "account_id": row["account_id"],
                "code": row["account__code"],
                "name": row["account__name"],
                "type": row["account__type"],
                "debit": _format_amount(row["debit"]),
                "credit": _format_amount(row["credit"]),
            }
            for row in lines
        ]
        return Response(data, status=status.HTTP_200_OK)


@extend_schema(tags=["Reports"], summary="General ledger")
class GeneralLedgerView(APIView):
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        permissions = super().get_permissions()
        permissions.append(HasPermission("accounting.reports.view"))
        return permissions

    def get(self, request):
        account_id = request.query_params.get("account_id")
        date_from = _parse_date_param(request, "date_from")
        date_to = _parse_date_param(request, "date_to")
        if not account_id or not date_from or not date_to:
            return Response(
                {"detail": "account_id, date_from, and date_to are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if date_from > date_to:
            return Response(
                {"detail": "date_from must be before date_to."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        account = Account.objects.filter(company=request.user.company, id=account_id).first()
        if not account:
            return Response({"detail": "Account not found."}, status=status.HTTP_404_NOT_FOUND)

        journal_lines = (
            JournalLine.objects.filter(
                company=request.user.company,
                account=account,
                entry__status=JournalEntry.Status.POSTED,
                entry__date__gte=date_from,
                entry__date__lte=date_to,
            )
            .select_related("entry", "cost_center")
            .order_by("entry__date", "id")
        )

        running_balance = Decimal("0")
        lines = []
        for line in journal_lines:
            running_balance += (line.debit - line.credit)
            lines.append(
                {
                    "id": line.id,
                    "date": line.entry.date.isoformat(),
                    "description": line.description,
                    "debit": _format_amount(line.debit),
                    "credit": _format_amount(line.credit),
                    "memo": line.entry.memo,
                    "reference_type": line.entry.reference_type,
                    "reference_id": line.entry.reference_id,
                    "cost_center": (
                        {
                            "id": line.cost_center.id,
                            "code": line.cost_center.code,
                            "name": line.cost_center.name,
                        }
                        if line.cost_center
                        else None
                    ),
                    "running_balance": _format_amount(running_balance),
                }
            )

        return Response(
            {
                "account": {
                    "id": account.id,
                    "code": account.code,
                    "name": account.name,
                    "type": account.type,
                },
                "lines": lines,
            },
            status=status.HTTP_200_OK,
        )


@extend_schema(tags=["Reports"], summary="Profit and loss")
class ProfitLossView(APIView):
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        permissions = super().get_permissions()
        permissions.append(HasPermission("accounting.reports.view"))
        return permissions

    def get(self, request):
        date_from = _parse_date_param(request, "date_from")
        date_to = _parse_date_param(request, "date_to")
        if not date_from or not date_to:
            return Response(
                {"detail": "date_from and date_to are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if date_from > date_to:
            return Response(
                {"detail": "date_from must be before date_to."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        rows = (
            JournalLine.objects.filter(
                company=request.user.company,
                entry__status=JournalEntry.Status.POSTED,
                entry__date__gte=date_from,
                entry__date__lte=date_to,
                account__type__in=[Account.Type.INCOME, Account.Type.EXPENSE],
            )
            .values("account_id", "account__code", "account__name", "account__type")
            .annotate(
                debit=Coalesce(
                    Sum("debit"), Value(0), output_field=DecimalField(max_digits=14, decimal_places=2)
                ),
                credit=Coalesce(
                    Sum("credit"), Value(0), output_field=DecimalField(max_digits=14, decimal_places=2)
                ),
            )
            .order_by("account__code")
        )

        income_accounts = []
        expense_accounts = []
        income_total = Decimal("0")
        expense_total = Decimal("0")

        for row in rows:
            debit = Decimal(row["debit"])
            credit = Decimal(row["credit"])
            account_type = row["account__type"]
            if account_type == Account.Type.INCOME:
                net = credit - debit
                income_total += net
            else:
                net = debit - credit
                expense_total += net

            item = {
                "account_id": row["account_id"],
                "code": row["account__code"],
                "name": row["account__name"],
                "type": account_type,
                "debit": _format_amount(debit),
                "credit": _format_amount(credit),
                "net": _format_amount(net),
            }
            if account_type == Account.Type.INCOME:
                income_accounts.append(item)
            else:
                expense_accounts.append(item)

        net_profit = income_total - expense_total

        return Response(
            {
                "date_from": date_from.isoformat(),
                "date_to": date_to.isoformat(),
                "income_total": _format_amount(income_total),
                "expense_total": _format_amount(expense_total),
                "net_profit": _format_amount(net_profit),
                "income_accounts": income_accounts,
                "expense_accounts": expense_accounts,
            },
            status=status.HTTP_200_OK,
        )


@extend_schema(tags=["Reports"], summary="Balance sheet")
class BalanceSheetView(APIView):
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        permissions = super().get_permissions()
        permissions.append(HasPermission("accounting.reports.view"))
        return permissions

    def get(self, request):
        as_of = _parse_date_param(request, "as_of")
        if not as_of:
            return Response(
                {"detail": "as_of is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        rows = (
            JournalLine.objects.filter(
                company=request.user.company,
                entry__status=JournalEntry.Status.POSTED,
                entry__date__lte=as_of,
                account__type__in=[
                    Account.Type.ASSET,
                    Account.Type.LIABILITY,
                    Account.Type.EQUITY,
                ],
            )
            .values("account_id", "account__code", "account__name", "account__type")
            .annotate(
                debit=Coalesce(
                    Sum("debit"), Value(0), output_field=DecimalField(max_digits=14, decimal_places=2)
                ),
                credit=Coalesce(
                    Sum("credit"), Value(0), output_field=DecimalField(max_digits=14, decimal_places=2)
                ),
            )
            .order_by("account__code")
        )

        assets = []
        liabilities = []
        equity = []
        assets_total = Decimal("0")
        liabilities_total = Decimal("0")
        equity_total = Decimal("0")

        for row in rows:
            debit = Decimal(row["debit"])
            credit = Decimal(row["credit"])
            account_type = row["account__type"]
            if account_type == Account.Type.ASSET:
                balance = debit - credit
                assets_total += balance
            elif account_type == Account.Type.LIABILITY:
                balance = credit - debit
                liabilities_total += balance
            else:
                balance = credit - debit
                equity_total += balance

            item = {
                "account_id": row["account_id"],
                "code": row["account__code"],
                "name": row["account__name"],
                "balance": _format_amount(balance),
            }
            if account_type == Account.Type.ASSET:
                assets.append(item)
            elif account_type == Account.Type.LIABILITY:
                liabilities.append(item)
            else:
                equity.append(item)

        auto_equity = assets_total - liabilities_total - equity_total
        if auto_equity.copy_abs() > Decimal("0.01"):
            equity.append(
                {
                    "account_id": None,
                    "code": "AUTO",
                    "name": "Retained Earnings (Auto)",
                    "balance": _format_amount(auto_equity),
                }
            )
            equity_total += auto_equity

        liabilities_equity_total = liabilities_total + equity_total

        return Response(
            {
                "as_of": as_of.isoformat(),
                "assets": assets,
                "liabilities": liabilities,
                "equity": equity,
                "totals": {
                    "assets_total": _format_amount(assets_total),
                    "liabilities_total": _format_amount(liabilities_total),
                    "equity_total": _format_amount(equity_total),
                    "liabilities_equity_total": _format_amount(liabilities_equity_total),
                },
            },
            status=status.HTTP_200_OK,
        )