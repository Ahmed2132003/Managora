from rest_framework import serializers

from core.models import Role


class RoleSerializer(serializers.ModelSerializer):
    permissions = serializers.SerializerMethodField()

    class Meta:
        model = Role
        fields = ("id", "name", "slug", "permissions")

    def get_permissions(self, obj):
        return list(
            obj.permissions.order_by("code").values_list("code", flat=True)
        )