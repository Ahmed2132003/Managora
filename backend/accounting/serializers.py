from rest_framework import serializers

from accounting.models import Account, ChartOfAccounts, CostCenter
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