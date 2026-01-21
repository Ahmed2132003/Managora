from django.core.exceptions import ValidationError
from rest_framework import serializers

from accounting.models import (
    Account,
    ChartOfAccounts,
    CostCenter,
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
            raise serializers.ValidationError(exc.message_dict or exc.messages) from exc