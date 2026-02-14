from __future__ import annotations

from django.utils import timezone
from rest_framework import serializers

from core.models import Company, CompanySubscriptionCode


class GenerateSubscriptionCodeSerializer(serializers.Serializer):
    company_id = serializers.IntegerField(min_value=1)

    def validate_company_id(self, value: int) -> int:
        if not Company.objects.filter(id=value).exists():
            raise serializers.ValidationError("Company not found.")
        return value


class ActivateSubscriptionSerializer(serializers.Serializer):
    code = serializers.CharField(max_length=32)

    def validate_code(self, value: str) -> str:
        normalized = value.strip().upper()
        now = timezone.now()
        try:
            token = CompanySubscriptionCode.objects.select_related("company").get(code=normalized)
        except CompanySubscriptionCode.DoesNotExist as exc:
            raise serializers.ValidationError("Invalid payment code.") from exc

        if token.used_at is not None:
            raise serializers.ValidationError("Payment code already used.")
        if token.expires_at <= now:
            raise serializers.ValidationError("Payment code expired.")

        request = self.context.get("request")
        if request and request.user and token.company_id != getattr(request.user, "company_id", None):
            raise serializers.ValidationError("This code is not for your company.")

        self.context["subscription_code"] = token
        return normalized