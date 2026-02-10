from datetime import timedelta
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from rest_framework import serializers

from accounting.models import (
    Account,
    AccountMapping,
    ChartOfAccounts,
    CostCenter,
    Customer,
    Expense,
    ExpenseAttachment,
    Invoice,
    InvoiceLine,
    JournalEntry,
    JournalLine,
    Payment,
    CatalogItem,
    StockTransaction,
)

from accounting.services.journal import post_journal_entry
from accounting.services.payments import record_payment
from accounting.services.seed import TEMPLATES

class AccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = Account
        fields = [
            "id",
            "code",
            "name",
            "type",
            "parent",
            "chart",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]

    def validate_parent(self, parent):
        if not parent:
            return parent
        company = self.context["request"].user.company
        if parent.company_id != company.id:
            raise serializers.ValidationError("Parent must belong to the same company.")
        return parent

    def validate_chart(self, chart):
        if not chart:
            return chart
        company = self.context["request"].user.company
        if chart.company_id != company.id:
            raise serializers.ValidationError("Chart must belong to the same company.")
        return chart


class CostCenterSerializer(serializers.ModelSerializer):
    class Meta:
        model = CostCenter
        fields = [
            "id",
            "code",
            "name",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]


class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = [
            "id",
            "code",
            "name",
            "email",
            "phone",
            "address",
            "credit_limit",
            "payment_terms_days",
            "is_active",
            "created_at",
        ]
        read_only_fields = ["created_at"]

    def validate_payment_terms_days(self, value):
        if value < 0:
            raise serializers.ValidationError("Payment terms must be 0 or greater.")
        return value
    

class ApplyTemplateSerializer(serializers.Serializer):
    template_key = serializers.ChoiceField(choices=sorted(TEMPLATES.keys()))


class ChartOfAccountsSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChartOfAccounts
        fields = [
            "id",
            "name",
            "is_default",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]


class JournalLineSerializer(serializers.ModelSerializer):
    account = AccountSerializer(read_only=True)
    cost_center = CostCenterSerializer(read_only=True)

    class Meta:
        model = JournalLine
        fields = [
            "id",
            "account",
            "cost_center",
            "description",
            "debit",
            "credit",
        ]


class JournalEntrySerializer(serializers.ModelSerializer):
    lines = JournalLineSerializer(many=True, read_only=True)

    class Meta:
        model = JournalEntry
        fields = [
            "id",
            "date",
            "reference_type",
            "reference_id",
            "memo",
            "status",
            "created_by",
            "created_at",
            "updated_at",
            "lines",
        ]
        read_only_fields = ["created_at", "updated_at", "created_by"]


class JournalLineInputSerializer(serializers.Serializer):
    account_id = serializers.IntegerField()
    cost_center_id = serializers.IntegerField(required=False, allow_null=True)
    description = serializers.CharField(required=False, allow_blank=True)
    debit = serializers.DecimalField(max_digits=14, decimal_places=2, required=False)
    credit = serializers.DecimalField(max_digits=14, decimal_places=2, required=False)


class JournalEntryCreateSerializer(serializers.Serializer):
    date = serializers.DateField()
    memo = serializers.CharField(required=False, allow_blank=True)
    reference_type = serializers.ChoiceField(
        choices=JournalEntry.ReferenceType.choices,
        required=False,
    )
    reference_id = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    status = serializers.ChoiceField(
        choices=JournalEntry.Status.choices,
        required=False,
    )
    lines = JournalLineInputSerializer(many=True)

    def create(self, validated_data):
        request = self.context["request"]
        try:
            return post_journal_entry(
                company=request.user.company,
                payload=validated_data,
                created_by=request.user,
            )
        except ValidationError as exc:
            if getattr(exc, "error_dict", None):
                detail = exc.message_dict
            else:
                detail = exc.messages
            raise serializers.ValidationError(detail) from exc


class InvoiceLineSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvoiceLine
        fields = ["id", "description", "quantity", "unit_price", "line_total"]
        read_only_fields = ["id", "line_total"]


class InvoiceSerializer(serializers.ModelSerializer):
    lines = InvoiceLineSerializer(many=True)
    total_paid = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    remaining_balance = serializers.DecimalField(
        max_digits=14, decimal_places=2, read_only=True
    )

    class Meta:
        model = Invoice
        fields = [
            "id",
            "invoice_number",
            "customer",
            "issue_date",
            "due_date",
            "status",
            "subtotal",
            "tax_amount",
            "total_amount",
            "total_paid",
            "remaining_balance",
            "notes",
            "created_by",
            "created_at",
            "lines",
        ]
        read_only_fields = [
            "due_date",
            "status",
            "subtotal",
            "total_amount",
            "total_paid",
            "remaining_balance",
            "created_by",
            "created_at",
        ]
        
    def validate(self, attrs):
        request = self.context["request"]
        company = request.user.company
        customer = attrs.get("customer") or getattr(self.instance, "customer", None)
        invoice_number = attrs.get("invoice_number") or getattr(
            self.instance, "invoice_number", None
        )
        if customer and customer.company_id != company.id:
            raise serializers.ValidationError("Customer must belong to the same company.")
        if invoice_number:
            existing_invoice = Invoice.objects.filter(
                company=company, invoice_number=invoice_number
            )
            if self.instance:
                existing_invoice = existing_invoice.exclude(pk=self.instance.pk)
            if existing_invoice.exists():
                raise serializers.ValidationError(
                    {"invoice_number": "Invoice number already exists for this company."}
                )

        if not self.instance and not attrs.get("lines"):
            raise serializers.ValidationError({"lines": "At least one line is required."})
        if "lines" in attrs and not attrs.get("lines"):
            raise serializers.ValidationError({"lines": "At least one line is required."})        
        return attrs

    def _calculate_totals(self, lines_data, tax_amount):
        subtotal = sum(
            (line["quantity"] * line["unit_price"] for line in lines_data),
            Decimal("0"),
        )
        tax_value = tax_amount or Decimal("0")
        total_amount = subtotal + tax_value
        return subtotal, total_amount

    def _get_due_date(self, issue_date, customer):
        return issue_date + timedelta(days=customer.payment_terms_days)

    def _create_lines(self, invoice, lines_data):
        InvoiceLine.objects.bulk_create(
            [
                InvoiceLine(
                    invoice=invoice,
                    description=line["description"],
                    quantity=line["quantity"],
                    unit_price=line["unit_price"],
                    line_total=line["quantity"] * line["unit_price"],
                )
                for line in lines_data
            ]
        )

    def create(self, validated_data):
        lines_data = validated_data.pop("lines")
        tax_amount = validated_data.get("tax_amount")
        issue_date = validated_data["issue_date"]
        customer = validated_data["customer"]

        subtotal, total_amount = self._calculate_totals(lines_data, tax_amount)
        due_date = self._get_due_date(issue_date, customer)

        try:
            invoice = Invoice.objects.create(
                company=self.context["request"].user.company,
                created_by=self.context["request"].user,
                due_date=due_date,
                subtotal=subtotal,
                total_amount=total_amount,
                **validated_data,
            )
        except IntegrityError as exc:
            raise serializers.ValidationError(
                {"invoice_number": "Invoice number already exists for this company."}
            ) from exc
        self._create_lines(invoice, lines_data)
        return invoice
    
    def update(self, instance, validated_data):
        lines_data = validated_data.pop("lines", None)
        tax_amount = validated_data.get("tax_amount", instance.tax_amount)
        issue_date = validated_data.get("issue_date", instance.issue_date)
        customer = validated_data.get("customer", instance.customer)

        if "issue_date" in validated_data or "customer" in validated_data:
            instance.due_date = self._get_due_date(issue_date, customer)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if lines_data is not None:
            instance.lines.all().delete()
            self._create_lines(instance, lines_data)
            subtotal, total_amount = self._calculate_totals(lines_data, tax_amount)
        else:
            subtotal = sum(
                (line.line_total for line in instance.lines.all()),
                Decimal("0"),
            )
            total_amount = subtotal + (tax_amount or Decimal("0"))

        instance.subtotal = subtotal
        instance.tax_amount = tax_amount
        instance.total_amount = total_amount
        instance.save()
        return instance


class ExpenseAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExpenseAttachment        
        fields = ["id", "file", "uploaded_by", "created_at"]
        read_only_fields = ["id", "uploaded_by", "created_at"]


class ExpenseSerializer(serializers.ModelSerializer):
    attachments = ExpenseAttachmentSerializer(many=True, read_only=True)

    class Meta:
        model = Expense
        fields = [
            "id",
            "date",
            "vendor_name",
            "category",
            "amount",
            "currency",
            "payment_method",
            "paid_from_account",
            "expense_account",
            "cost_center",
            "notes",
            "status",
            "created_by",
            "created_at",
            "updated_at",
            "attachments",
        ]
        read_only_fields = ["created_by", "created_at", "updated_at", "attachments"]

    def validate(self, attrs):
        request = self.context["request"]
        company = request.user.company
        paid_from_account = attrs.get("paid_from_account")
        expense_account = attrs.get("expense_account")
        cost_center = attrs.get("cost_center")

        if paid_from_account and paid_from_account.company_id != company.id:
            raise serializers.ValidationError("Paid-from account must belong to the same company.")
        if expense_account and expense_account.company_id != company.id:
            raise serializers.ValidationError("Expense account must belong to the same company.")
        if cost_center and cost_center.company_id != company.id:
            raise serializers.ValidationError("Cost center must belong to the same company.")
        return attrs


class AccountMappingSerializer(serializers.ModelSerializer):
    account_name = serializers.CharField(source="account.name", read_only=True)
    account_code = serializers.CharField(source="account.code", read_only=True)

    class Meta:
        model = AccountMapping
        fields = [
            "id",
            "key",
            "account",
            "account_name",
            "account_code",
            "required",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]

    def validate_account(self, account):
        if not account:
            return account
        company = self.context["request"].user.company
        if account.company_id != company.id:
            raise serializers.ValidationError("Account must belong to the same company.")
        return account

    def validate(self, attrs):
        key = attrs.get("key") or getattr(self.instance, "key", None)
        account = attrs.get("account") or getattr(self.instance, "account", None)
        required = attrs.get("required", getattr(self.instance, "required", None))
        if required is None:
            required = key in AccountMapping.REQUIRED_KEYS
            attrs["required"] = required
        if key in AccountMapping.REQUIRED_KEYS and required is False:
            raise serializers.ValidationError("Required mappings cannot be optional.")
        if key in AccountMapping.REQUIRED_KEYS and not account:
            raise serializers.ValidationError("Required account mapping must include an account.")
        return attrs

    def create(self, validated_data):
        key = validated_data.get("key")
        if "required" not in validated_data:
            validated_data["required"] = key in AccountMapping.REQUIRED_KEYS
        return super().create(validated_data)


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = [
            "id",
            "company",
            "customer",
            "invoice",
            "payment_date",
            "amount",
            "method",
            "cash_account",
            "notes",
            "created_by",
            "created_at",
        ]
        read_only_fields = ["company", "created_by", "created_at"]

    def validate(self, attrs):
        request = self.context["request"]
        company = request.user.company
        customer = attrs.get("customer") or getattr(self.instance, "customer", None)
        invoice = attrs.get("invoice") or getattr(self.instance, "invoice", None)
        cash_account = attrs.get("cash_account") or getattr(
            self.instance, "cash_account", None
        )

        if customer and customer.company_id != company.id:
            raise serializers.ValidationError("Customer must belong to the same company.")
        if invoice:
            if invoice.company_id != company.id:
                raise serializers.ValidationError("Invoice must belong to the same company.")
            if customer and invoice.customer_id != customer.id:
                raise serializers.ValidationError("Invoice customer mismatch.")
        if cash_account and cash_account.company_id != company.id:
            raise serializers.ValidationError("Cash account must belong to the same company.")
        return attrs

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Amount must be greater than zero.")
        return value

    def create(self, validated_data):
        request = self.context["request"]
        try:
            with transaction.atomic():
                payment = Payment.objects.create(
                    company=request.user.company,
                    created_by=request.user,
                    **validated_data,
                )
                record_payment(payment)
        except ValidationError as exc:
            if getattr(exc, "error_dict", None):
                detail = exc.message_dict
            else:
                detail = exc.messages
            raise serializers.ValidationError(detail) from exc
        return payment
    

class AccountMappingBulkSetSerializer(serializers.Serializer):
    mappings = serializers.DictField(
        child=serializers.IntegerField(allow_null=True),
        allow_empty=False,
    )

    def validate_mappings(self, mappings):
        allowed_keys = {key for key, _ in AccountMapping.Key.choices}
        invalid_keys = [key for key in mappings.keys() if key not in allowed_keys]
        if invalid_keys:
            raise serializers.ValidationError(
                f"Invalid mapping keys: {', '.join(sorted(invalid_keys))}."
            )
        return mappings

class ExpenseAttachmentCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExpenseAttachment
        fields = ["id", "file"]
        read_only_fields = ["id"]

class CatalogItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = CatalogItem
        fields = [
            "id",
            "item_type",
            "name",
            "barcode",
            "stock_quantity",
            "cost_price",
            "sale_price",
            "is_active",
            "created_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_by", "created_at", "updated_at"]

    def validate(self, attrs):
        request = self.context["request"]
        company = request.user.company
        barcode = attrs.get("barcode") or getattr(self.instance, "barcode", None)
        item_type = attrs.get("item_type") or getattr(self.instance, "item_type", None)

        if barcode:
            qs = CatalogItem.objects.filter(company=company, barcode=barcode)
            if self.instance:
                qs = qs.exclude(id=self.instance.id)
            if qs.exists():
                raise serializers.ValidationError({"barcode": "Barcode already exists for this company."})

        stock_quantity = attrs.get("stock_quantity")
        if item_type == CatalogItem.ItemType.SERVICE:
            attrs["stock_quantity"] = Decimal("0")
        elif stock_quantity is not None and stock_quantity < 0:
            raise serializers.ValidationError({"stock_quantity": "Stock quantity cannot be negative."})
        return attrs


class StockTransactionSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source="item.name", read_only=True)

    class Meta:
        model = StockTransaction
        fields = [
            "id",
            "item",
            "item_name",
            "transaction_type",
            "quantity_delta",
            "unit_cost",
            "unit_price",
            "memo",
            "invoice",
            "created_by",
            "created_at",
        ]
        read_only_fields = ["created_by", "created_at"]

    def validate(self, attrs):
        request = self.context["request"]
        company = request.user.company
        item = attrs.get("item")
        if item and item.company_id != company.id:
            raise serializers.ValidationError("Item must belong to the same company.")
        return attrs