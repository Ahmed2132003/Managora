from rest_framework import serializers

from core.models import Role, User


class RoleMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = ("id", "name", "slug")


class UserSerializer(serializers.ModelSerializer):
    roles = RoleMiniSerializer(many=True, read_only=True)

    class Meta:
        model = User
        fields = ("id", "username", "email", "is_active", "roles", "date_joined")


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    email = serializers.EmailField(required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ("id", "username", "email", "is_active", "password")


class UserUpdateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=False)
    email = serializers.EmailField(required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ("username", "email", "is_active", "password")