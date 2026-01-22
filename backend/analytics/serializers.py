from rest_framework import serializers

from analytics.models import KPIFactDaily


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