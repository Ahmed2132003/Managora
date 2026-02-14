from __future__ import annotations

from datetime import timedelta

from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import Company, CompanySubscriptionCode
from core.serializers.subscriptions import (
    ActivateSubscriptionSerializer,
    GenerateSubscriptionCodeSerializer,
)


class GenerateCompanyPaymentCodeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        tags=["Subscriptions"],
        summary="Generate payment code for company",
        request=GenerateSubscriptionCodeSerializer,
    )
    def post(self, request):
        if not request.user.is_superuser:
            return Response({"detail": "Only superusers can generate payment codes."}, status=403)

        serializer = GenerateSubscriptionCodeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        company = Company.objects.get(id=serializer.validated_data["company_id"])
        now = timezone.now()
        expires_at = now + timedelta(hours=24)

        code = CompanySubscriptionCode.generate_code()
        while CompanySubscriptionCode.objects.filter(code=code).exists():
            code = CompanySubscriptionCode.generate_code()

        payment_code = CompanySubscriptionCode.objects.create(
            company=company,
            code=code,
            created_by=request.user,
            expires_at=expires_at,
        )

        return Response(
            {
                "id": payment_code.id,
                "code": payment_code.code,
                "company_id": company.id,
                "company_name": company.name,
                "expires_at": payment_code.expires_at,
            },
            status=status.HTTP_201_CREATED,
        )


class ActivateCompanySubscriptionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        tags=["Subscriptions"],
        summary="Activate company subscription by payment code",
        request=ActivateSubscriptionSerializer,
    )
    def post(self, request):
        serializer = ActivateSubscriptionSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)

        payment_code = serializer.context["subscription_code"]
        now = timezone.now()
        next_expiry = now + timedelta(days=90)

        payment_code.used_at = now
        payment_code.consumed_by = request.user
        payment_code.save(update_fields=["used_at", "consumed_by"])

        company = payment_code.company
        company.is_active = True
        company.subscription_expires_at = next_expiry
        company.save(update_fields=["is_active", "subscription_expires_at"])

        return Response(
            {
                "detail": "Subscription activated successfully.",
                "company_id": company.id,
                "subscription_expires_at": company.subscription_expires_at,
            }
        )