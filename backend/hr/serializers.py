from django.contrib.auth import get_user_model
from rest_framework import serializers

from hr.models import (
    AttendanceRecord,
    Department,
    Employee,
    EmployeeDocument,
    JobTitle,
    Shift,
    WorkSite,
)

User = get_user_model()


class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = ("id", "name", "is_active")


class JobTitleSerializer(serializers.ModelSerializer):
    class Meta:
        model = JobTitle
        fields = ("id", "name", "is_active")


class DepartmentMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = ("id", "name")


class JobTitleMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = JobTitle
        fields = ("id", "name")


class ManagerMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = Employee
        fields = ("id", "full_name")


class EmployeeSerializer(serializers.ModelSerializer):
    department = DepartmentMiniSerializer(read_only=True)
    job_title = JobTitleMiniSerializer(read_only=True)
    manager = ManagerMiniSerializer(read_only=True)

    class Meta:
        model = Employee
        fields = (
            "id",
            "employee_code",
            "full_name",
            "status",
            "hire_date",
            "department",
            "job_title",
            "manager",
        )


class EmployeeDetailSerializer(serializers.ModelSerializer):
    department = DepartmentMiniSerializer(read_only=True)
    job_title = JobTitleMiniSerializer(read_only=True)
    manager = ManagerMiniSerializer(read_only=True)

    class Meta:
        model = Employee
        fields = (
            "id",
            "employee_code",
            "full_name",
            "national_id",
            "hire_date",
            "status",
            "department",
            "job_title",
            "manager",
            "user",
        )


class EmployeeCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Employee
        fields = (
            "id",
            "employee_code",
            "full_name",
            "national_id",
            "hire_date",
            "status",
            "department",
            "job_title",
            "manager",
            "user",
        )
        read_only_fields = ("id",)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            company = request.user.company
            self.fields["department"].queryset = Department.objects.filter(
                company=company
            )
            self.fields["job_title"].queryset = JobTitle.objects.filter(
                company=company
            )
            self.fields["manager"].queryset = Employee.objects.filter(company=company)
            self.fields["user"].queryset = User.objects.filter(company=company)

    def validate(self, attrs):
        if "company" in self.initial_data:
            raise serializers.ValidationError({"company": "This field is not allowed."})

        request = self.context.get("request")
        company = request.user.company if request else None

        manager = attrs.get("manager")
        if manager and manager.company_id != company.id:
            raise serializers.ValidationError({"manager": "Manager must belong to the same company."})
        if manager and manager.is_deleted:
            raise serializers.ValidationError({"manager": "Manager is deleted."})

        department = attrs.get("department")
        if department and department.company_id != company.id:
            raise serializers.ValidationError({"department": "Department must belong to the same company."})

        job_title = attrs.get("job_title")
        if job_title and job_title.company_id != company.id:
            raise serializers.ValidationError({"job_title": "Job title must belong to the same company."})

        user = attrs.get("user")
        if user and user.company_id != company.id:
            raise serializers.ValidationError({"user": "User must belong to the same company."})

        return attrs

    def validate_employee_code(self, value):
        if not value:
            raise serializers.ValidationError("employee_code is required.")

        request = self.context.get("request")
        if not request:
            return value

        company = request.user.company
        queryset = Employee.objects.filter(company=company, employee_code=value)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError("employee_code must be unique per company.")
        return value

    def create(self, validated_data):
        request = self.context.get("request")
        company = request.user.company
        validated_data["company"] = company
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data.pop("company", None)
        return super().update(instance, validated_data)


class EmployeeDocumentSerializer(serializers.ModelSerializer):
    uploaded_by = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = EmployeeDocument
        fields = (
            "id",
            "employee",
            "doc_type",
            "title",
            "file",
            "uploaded_by",
            "created_at",
        )


class EmployeeDocumentCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmployeeDocument
        fields = ("id", "doc_type", "title", "file")
        read_only_fields = ("id",)

    def validate(self, attrs):
        request = self.context.get("request")
        employee = self.context.get("employee")
        if not request or not employee:
            return attrs

        if employee.company_id != request.user.company_id:
            raise serializers.ValidationError(
                {"employee": "Employee must belong to the same company."}
            )
        if employee.is_deleted:
            raise serializers.ValidationError(
                {"employee": "Cannot upload documents for deleted employee."}
            )
        return attrs

    def create(self, validated_data):
        request = self.context.get("request")
        employee = self.context.get("employee")
        validated_data["company"] = employee.company
        validated_data["employee"] = employee
        validated_data["uploaded_by"] = request.user if request else None
        return super().create(validated_data)


class AttendanceEmployeeSerializer(serializers.ModelSerializer):
    department = DepartmentMiniSerializer(read_only=True)

    class Meta:
        model = Employee
        fields = ("id", "employee_code", "full_name", "department")


class AttendanceRecordSerializer(serializers.ModelSerializer):
    employee = AttendanceEmployeeSerializer(read_only=True)

    class Meta:
        model = AttendanceRecord
        fields = (
            "id",
            "employee",
            "date",
            "check_in_time",
            "check_out_time",
            "check_in_lat",
            "check_in_lng",
            "check_out_lat",
            "check_out_lng",
            "method",
            "status",
            "late_minutes",
            "early_leave_minutes",
            "notes",
        )


class AttendanceActionSerializer(serializers.Serializer):
    employee_id = serializers.PrimaryKeyRelatedField(
        source="employee", queryset=Employee.objects.none()
    )
    worksite_id = serializers.PrimaryKeyRelatedField(
        source="worksite", queryset=WorkSite.objects.none(), required=False, allow_null=True
    )
    shift_id = serializers.PrimaryKeyRelatedField(
        source="shift", queryset=Shift.objects.none(), required=False, allow_null=True
    )
    method = serializers.ChoiceField(choices=AttendanceRecord.Method.choices)
    lat = serializers.DecimalField(
        max_digits=9, decimal_places=6, required=False, allow_null=True
    )
    lng = serializers.DecimalField(
        max_digits=9, decimal_places=6, required=False, allow_null=True
    )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            company = request.user.company
            self.fields["employee_id"].queryset = Employee.objects.filter(company=company)
            self.fields["worksite_id"].queryset = WorkSite.objects.filter(company=company)
            self.fields["shift_id"].queryset = Shift.objects.filter(company=company)

    def validate(self, attrs):
        method = attrs.get("method")
        shift = attrs.get("shift")
        worksite = attrs.get("worksite")
        lat = attrs.get("lat")
        lng = attrs.get("lng")

        if not shift:
            raise serializers.ValidationError({"shift_id": "shift_id is required."})

        if (lat is None) ^ (lng is None):
            raise serializers.ValidationError({"location": "Both lat and lng are required."})

        if method == AttendanceRecord.Method.GPS:
            if not worksite:
                raise serializers.ValidationError({"worksite_id": "worksite_id is required for GPS."})
            if lat is None or lng is None:
                raise serializers.ValidationError({"location": "lat/lng is required for GPS."})

        return attrs