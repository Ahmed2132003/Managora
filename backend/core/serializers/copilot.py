from rest_framework import serializers


class AttendanceReportParamsSerializer(serializers.Serializer):
    start_date = serializers.DateField(required=False)
    end_date = serializers.DateField(required=False)
    department_id = serializers.IntegerField(required=False)

    def validate(self, attrs):
        start_date = attrs.get("start_date")
        end_date = attrs.get("end_date")
        if start_date and end_date and start_date > end_date:
            raise serializers.ValidationError("start_date must be before end_date.")
        return attrs


class TopLateEmployeesParamsSerializer(serializers.Serializer):
    start_date = serializers.DateField(required=False)
    end_date = serializers.DateField(required=False)
    limit = serializers.IntegerField(required=False, min_value=1, max_value=50)

    def validate(self, attrs):
        start_date = attrs.get("start_date")
        end_date = attrs.get("end_date")
        if start_date and end_date and start_date > end_date:
            raise serializers.ValidationError("start_date must be before end_date.")
        return attrs


class PayrollSummaryParamsSerializer(serializers.Serializer):
    year = serializers.IntegerField(required=False, min_value=2000, max_value=2100)
    month = serializers.IntegerField(required=False, min_value=1, max_value=12)


class TopDebtorsParamsSerializer(serializers.Serializer):
    limit = serializers.IntegerField(required=False, min_value=1, max_value=50)


class ProfitChangeExplainParamsSerializer(serializers.Serializer):
    start_date = serializers.DateField(required=False)
    end_date = serializers.DateField(required=False)

    def validate(self, attrs):
        start_date = attrs.get("start_date")
        end_date = attrs.get("end_date")
        if start_date and end_date and start_date > end_date:
            raise serializers.ValidationError("start_date must be before end_date.")
        return attrs


class CopilotQuerySerializer(serializers.Serializer):
    question = serializers.CharField()
    intent = serializers.CharField()
    params = serializers.JSONField(required=False)