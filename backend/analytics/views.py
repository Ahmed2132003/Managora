from django.utils.dateparse import parse_date
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.generics import ListAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from analytics.models import KPIDefinition, KPIFactDaily
from analytics.serializers import AnalyticsRebuildSerializer, KPIFactDailySerializer
from analytics.tasks import build_analytics_range
from core.permissions import HasAnyPermission, HasPermission, user_has_permission


class KPIFactDailyListView(ListAPIView):
    serializer_class = KPIFactDailySerializer
    permission_classes = [
        HasAnyPermission(
            [
                "analytics.view_ceo",
                "analytics.view_finance",
                "analytics.view_hr",
            ]
        )
    ]

    @extend_schema(
        tags=["Analytics"],
        summary="List KPI facts",
        responses={200: KPIFactDailySerializer(many=True)},
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    def _allowed_categories(self, user):
        if user_has_permission(user, "analytics.view_ceo"):
            return None

        categories = set()
        if user_has_permission(user, "analytics.view_finance"):
            categories.update({KPIDefinition.Category.FINANCE, KPIDefinition.Category.CASH})
        if user_has_permission(user, "analytics.view_hr"):
            categories.add(KPIDefinition.Category.HR)
        return categories

    def get_queryset(self):
        company = self.request.user.company
        queryset = KPIFactDaily.objects.filter(company=company)

        kpi_key = self.request.query_params.get("kpi_key")
        if kpi_key:
            queryset = queryset.filter(kpi_key=kpi_key)

        start_date = parse_date(self.request.query_params.get("start_date", ""))
        end_date = parse_date(self.request.query_params.get("end_date", ""))
        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)

        allowed_categories = self._allowed_categories(self.request.user)
        if allowed_categories:
            allowed_keys = KPIDefinition.objects.filter(
                company=company,
                category__in=allowed_categories,
                is_active=True,
            ).values_list("key", flat=True)
            queryset = queryset.filter(kpi_key__in=allowed_keys)

        return queryset.order_by("-date", "kpi_key")


class AnalyticsRebuildView(APIView):
    permission_classes = [HasPermission("analytics.manage_rebuild")]

    @extend_schema(
        tags=["Analytics"],
        summary="Rebuild analytics KPIs for a date range",
        request=AnalyticsRebuildSerializer,
        responses={200: AnalyticsRebuildSerializer},
    )
    def post(self, request, *args, **kwargs):
        serializer = AnalyticsRebuildSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payload = serializer.validated_data
        result = build_analytics_range(
            request.user.company_id,
            payload["start_date"],
            payload["end_date"],
        )
        return Response(
            {
                "status": result["status"],
                "start_date": payload["start_date"],
                "end_date": payload["end_date"],
            },
            status=status.HTTP_200_OK,
        )