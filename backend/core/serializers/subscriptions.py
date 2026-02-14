from __future__ import annotations

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import serializers

from core.models import Company, CompanySubscriptionCode

User = get_user_model()


class GenerateSubscriptionCodeSerializer(serializers.Serializer):
    company_id = serializers.IntegerField(min_value=1)

    def validate_company_id(self, value: int) -> int:
        if not Company.objects.filter(id=value).exists():
            raise serializers.ValidationError("Company not found.")
        return value


class ActivateSubscriptionSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    code = serializers.CharField(max_length=32)

    def validate(self, attrs):
        raw_username = (attrs.get("username") or "").strip()
        normalized_code = (attrs.get("code") or "").strip().upper()
        now = timezone.now()

        try:
            user = User.objects.select_related("company").get(username=raw_username)
        except User.DoesNotExist as exc:
            raise serializers.ValidationError({"username": "User not found."}) from exc

        if not user.is_active:
            raise serializers.ValidationError({"username": "User account is disabled."})

        try:
            token = CompanySubscriptionCode.objects.select_related("company").get(code=normalized_code)
        except CompanySubscriptionCode.DoesNotExist as exc:
            raise serializers.ValidationError({"code": "Invalid payment code."}) from exc

        if token.used_at is not None:
            raise serializers.ValidationError({"code": "Payment code already used."})
        if token.expires_at <= now:
            raise serializers.ValidationError({"code": "Payment code expired."})
        if token.company_id != user.company_id:
            raise serializers.ValidationError({"code": "This code is not for this user company."})

        attrs["code"] = normalized_code
        self.context["subscription_code"] = token
        self.context["target_user"] = user
        return attrs