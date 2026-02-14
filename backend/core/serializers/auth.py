from __future__ import annotations

from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.models import update_last_login
from django.utils import timezone
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.settings import api_settings


class LoginSerializer(TokenObtainPairSerializer):
    """Custom login serializer with defensive error handling."""

    def validate(self, attrs):
        user_model = get_user_model()
        username_field = user_model.USERNAME_FIELD
        raw_username = (
            attrs.get(username_field)
            or attrs.get("username")
            or attrs.get("email")
            or ""
        )
        password = attrs.get("password") or ""

        if not raw_username:
            raise serializers.ValidationError({"detail": "Username or email is required."})
        if not password:
            raise serializers.ValidationError({"detail": "Password is required."})

        if username_field != "email" and "@" in raw_username:
            try:
                user = user_model._default_manager.get(email__iexact=raw_username)
                raw_username = getattr(user, username_field)
            except user_model.DoesNotExist:
                pass

        try:
            user = authenticate(
                self.context.get("request"),
                **{username_field: raw_username, "password": password},
            )
        except Exception as exc:
            raise serializers.ValidationError(
                {"detail": "Unable to authenticate with provided credentials."}
            ) from exc

        if not user:
            raise serializers.ValidationError(
                {"detail": "No active account found with the given credentials."},
                code="authorization",
            )
        if not getattr(user, "is_active", False):
            raise serializers.ValidationError(
                {"detail": "Account is disabled."},
                code="authorization",
            )
        if getattr(user, "company_id", None) is None:
            raise serializers.ValidationError(
                {"detail": "User is not linked to a company."},
                code="authorization",
            )

        company = getattr(user, "company", None)
        now = timezone.now()
        if company and company.subscription_expires_at and company.subscription_expires_at <= now:
            company.is_active = False
            company.save(update_fields=["is_active"])

        if company and not company.is_active:
            raise serializers.ValidationError(
                {"detail": "Company subscription is inactive. Please subscribe now."},
                code="authorization",
            )

        refresh = self.get_token(user)
        data = {"refresh": str(refresh), "access": str(refresh.access_token)}

        if api_settings.UPDATE_LAST_LOGIN:
            update_last_login(None, user)

        return data