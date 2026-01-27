from rest_framework import serializers

from core.models import Company, Role, User


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
    role_ids = serializers.ListField(
        child=serializers.IntegerField(), required=False, write_only=True
    )
    company = serializers.PrimaryKeyRelatedField(
        queryset=Company.objects.all(), required=False, write_only=True
    )

    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "email",
            "is_active",
            "password",
            "role_ids",
            "company",
        )

    def validate(self, attrs):
        request = self.context.get("request")
        company = attrs.get("company")
        if request and not request.user.is_superuser:
            company = request.user.company

        if request and request.user.is_superuser and company is None:
            raise serializers.ValidationError(
                {"company": "Company is required when creating users as superuser."}
            )

        if attrs.get("email") and company:
            if User.objects.filter(company=company, email__iexact=attrs["email"]).exists():
                raise serializers.ValidationError(
                    {"email": "Email is already used by another user in this company."}
                )

        attrs["company"] = company
        return attrs
    

class UserUpdateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=False)
    email = serializers.EmailField(required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ("username", "email", "is_active", "password")

    def validate_email(self, value):
        if not value:
            return value
        request = self.context.get("request")
        if request and User.objects.filter(
            company=request.user.company, email__iexact=value
            
        ).exclude(id=self.instance.id).exists():
            raise serializers.ValidationError(
                "Email is already used by another user in this company."
            )
        return value