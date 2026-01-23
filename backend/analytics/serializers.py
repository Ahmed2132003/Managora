from rest_framework import serializers

from analytics.models import AlertAck, AlertEvent, CashForecastSnapshot, KPIFactDaily


class KPIFactDailySerializer(serializers.ModelSerializer):
    class Meta:
        model = KPIFactDaily
        fields = ["id", "date", "kpi_key", "value", "meta"]


class AnalyticsRebuildSerializer(serializers.Serializer):
    start_date = serializers.DateField()
    end_date = serializers.DateField()

    def validate(self, attrs):
        if attrs["start_date"] > attrs["end_date"]:
            raise serializers.ValidationError("start_date must be before end_date")
        return attrs


class AlertEventListSerializer(serializers.ModelSerializer):
    severity = serializers.CharField(source="rule.severity")
    rule_key = serializers.CharField(source="rule.key")

    class Meta:
        model = AlertEvent
        fields = [
            "id",
            "event_date",
            "title",
            "status",
            "severity",
            "rule_key",
        ]


class AlertEventDetailSerializer(serializers.ModelSerializer):
    severity = serializers.CharField(source="rule.severity")
    rule_key = serializers.CharField(source="rule.key")
    rule_name = serializers.CharField(source="rule.name")

    class Meta:
        model = AlertEvent
        fields = [
            "id",
            "event_date",
            "title",
            "message",
            "status",
            "severity",
            "rule_key",
            "rule_name",
            "evidence",
            "recommended_actions",
            "created_at",
        ]


class AlertAckSerializer(serializers.ModelSerializer):
    class Meta:
        model = AlertAck
        fields = ["id", "acked_by", "acked_at", "note"]


class AlertAckCreateSerializer(serializers.Serializer):
    note = serializers.CharField(required=False, allow_blank=True)


class CashForecastSnapshotSerializer(serializers.ModelSerializer):
    class Meta:
        model = CashForecastSnapshot
        fields = [
            "as_of_date",
            "horizon_days",
            "expected_inflows",
            "expected_outflows",
            "net_expected",
            "details",
        ]