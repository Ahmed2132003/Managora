from rest_framework import serializers

from core.models import CompanySetupState, SetupTemplate


class SetupTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = SetupTemplate
        fields = [
            "code",
            "name_ar",
            "name_en",
            "description",
            "version",
        ]


class CompanySetupStateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompanySetupState
        fields = [
            "roles_applied",
            "policies_applied",
            "shifts_applied",
            "coa_applied",
            "updated_at",
        ]