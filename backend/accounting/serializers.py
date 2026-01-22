from django.core.exceptions import ValidationError
from rest_framework import serializers

from accounting.models import (
    Account,
    AccountMapping,
    ChartOfAccounts,
    CostCenter,
    Customer,
    Expense,
    ExpenseAttachment,
    JournalEntry,
    JournalLine,
)

from accounting.services.journal import post_journal_entry
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