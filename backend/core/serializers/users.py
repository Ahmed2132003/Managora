from rest_framework import serializers

from core.models import Company, Role, User
from core.permissions import is_admin_user


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

        # Company handling
        if request and not request.user.is_superuser:
            company = request.user.company

        if request and request.user.is_superuser and company is None:
            raise serializers.ValidationError(
                {"company": "Company is required when creating users as superuser."}
            )

        # Email uniqueness per company
        if attrs.get("email") and company:
            if User.objects.filter(company=company, email__iexact=attrs["email"]).exists():
                raise serializers.ValidationError(
                    {"email": "Email is already used by another user in this company."}
                )

        attrs["company"] = company

        # Role assignment rules
        role_ids = attrs.get("role_ids") or []
        if request:
            creator = request.user

            if role_ids:
                requested_roles = Role.objects.filter(id__in=role_ids)
                if requested_roles.count() != len(set(role_ids)):
                    raise serializers.ValidationError(
                        {"role_ids": "One or more role_ids are invalid."}
                    )

                if not creator.is_superuser and requested_roles.filter(name="Manager").exists():
                    raise serializers.ValidationError(
                        {"role_ids": "Only superusers can assign the Manager role."}
                    )

                # Superuser can assign any roles (except Manager restriction above)
                if not is_admin_user(creator):
                    creator_role_names = set(creator.roles.values_list("name", flat=True))

                    # Rules requested:
                    # - Manager: can create HR / Accountant / Employee only
                    # - HR: can create Accountant / Employee only
                    # - Accountant/Employee: cannot create at all
                    if "Manager" in creator_role_names:
                        allowed_names = {"HR", "Accountant", "Employee"}
                    elif "HR" in creator_role_names:
                        allowed_names = {"Accountant", "Employee"}
                    else:
                        raise serializers.ValidationError(
                            {"detail": "You do not have permission to create users."}
                        )

                    requested_names = set(requested_roles.values_list("name", flat=True))
                    if not requested_names.issubset(allowed_names):
                        raise serializers.ValidationError(
                            {
                                "role_ids": (
                                    "You can only assign these roles: "
                                    + ", ".join(sorted(allowed_names))
                                )
                            }
                        )
            else:
                if not is_admin_user(creator):
                    raise serializers.ValidationError(
                        {"role_ids": "You must assign a role when creating users."}
                    )

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
