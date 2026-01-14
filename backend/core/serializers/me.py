from rest_framework import serializers
from core.models import Company, User  # عدّل حسب مكان الموديلات عندك

class CompanyMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = ("id", "name")

class UserMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "username", "email", "first_name", "last_name")

class MeSerializer(serializers.Serializer):
    user = UserMiniSerializer()
    company = CompanyMiniSerializer()
