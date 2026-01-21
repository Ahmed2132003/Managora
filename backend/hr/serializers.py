from django.contrib.auth import get_user_model
from rest_framework import serializers

from hr.models import (
    AttendanceRecord,
    Department,
    Employee,
    EmployeeDocument,
    HRAction,
    JobTitle,
    LeaveBalance,
    LeaveRequest,
    LeaveType,
    LoanAdvance,
    PayrollLine,
    PayrollPeriod,
    PayrollRun,
    PolicyRule,
    SalaryComponent,
    SalaryStructure,
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
    qr_token = serializers.CharField(required=False, allow_blank=False)
    
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

        if method != AttendanceRecord.Method.QR and not shift:
            raise serializers.ValidationError({"shift_id": "shift_id is required."})
        if method == AttendanceRecord.Method.QR and not attrs.get("qr_token"):
            raise serializers.ValidationError({"qr_token": "qr_token is required."})

        if (lat is None) ^ (lng is None):
            raise serializers.ValidationError({"location": "Both lat and lng are required."})

        if method == AttendanceRecord.Method.GPS:
            if not worksite:
                raise serializers.ValidationError({"worksite_id": "worksite_id is required for GPS."})
            if lat is None or lng is None:
                raise serializers.ValidationError({"location": "lat/lng is required for GPS."})

        return attrs


class AttendanceQrGenerateSerializer(serializers.Serializer):
    worksite_id = serializers.PrimaryKeyRelatedField(
        source="worksite", queryset=WorkSite.objects.none()
    )
    shift_id = serializers.PrimaryKeyRelatedField(
        source="shift", queryset=Shift.objects.none()
    )
    expires_in_minutes = serializers.IntegerField(
        required=False, min_value=1, max_value=1440
    )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            company = request.user.company
            self.fields["worksite_id"].queryset = WorkSite.objects.filter(company=company)
            self.fields["shift_id"].queryset = Shift.objects.filter(company=company)

    def validate(self, attrs):
        attrs.setdefault("expires_in_minutes", 60)
        return attrs


class AttendanceQrTokenSerializer(serializers.Serializer):
    token = serializers.CharField()
    expires_at = serializers.DateTimeField()
    worksite_id = serializers.IntegerField()
    shift_id = serializers.IntegerField()


class LeaveTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = LeaveType
        fields = (
            "id",
            "name",
            "code",
            "requires_approval",
            "paid",
            "max_per_request_days",
            "allow_negative_balance",
            "is_active",
        )


class LeaveBalanceSerializer(serializers.ModelSerializer):
    remaining_days = serializers.SerializerMethodField()

    class Meta:
        model = LeaveBalance
        fields = (
            "id",
            "employee",
            "leave_type",
            "year",
            "allocated_days",
            "used_days",
            "carryover_days",
            "remaining_days",
        )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            company = request.user.company
            self.fields["employee"].queryset = Employee.objects.filter(company=company)
            self.fields["leave_type"].queryset = LeaveType.objects.filter(company=company)

    def get_remaining_days(self, obj):
        return obj.remaining_days

    def validate(self, attrs):
        request = self.context.get("request")
        company = request.user.company if request else None

        employee = attrs.get("employee") or getattr(self.instance, "employee", None)
        if employee and company and employee.company_id != company.id:
            raise serializers.ValidationError(
                {"employee": "Employee must belong to the same company."}
            )

        leave_type = attrs.get("leave_type") or getattr(self.instance, "leave_type", None)
        if leave_type and company and leave_type.company_id != company.id:
            raise serializers.ValidationError(
                {"leave_type": "Leave type must belong to the same company."}
            )

        return attrs


class LeaveEmployeeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Employee
        fields = ("id", "employee_code", "full_name")


class LeaveRequestSerializer(serializers.ModelSerializer):
    employee = LeaveEmployeeSerializer(read_only=True)
    leave_type = LeaveTypeSerializer(read_only=True)
    decided_by = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = LeaveRequest
        fields = (
            "id",
            "employee",
            "leave_type",
            "start_date",
            "end_date",
            "days",
            "reason",
            "status",
            "requested_at",
            "decided_at",
            "decided_by",
            "reject_reason",
        )


class LeaveRequestCreateSerializer(serializers.ModelSerializer):
    leave_type_id = serializers.PrimaryKeyRelatedField(
        source="leave_type", queryset=LeaveType.objects.none()
    )

    class Meta:
        model = LeaveRequest
        fields = ("id", "leave_type_id", "start_date", "end_date", "reason")
        read_only_fields = ("id",)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            company = request.user.company
            self.fields["leave_type_id"].queryset = LeaveType.objects.filter(
                company=company, is_active=True
            )

    def validate(self, attrs):
        employee = self.context.get("employee")
        if not employee:
            raise serializers.ValidationError("Employee profile is required.")
        attrs["employee"] = employee
        return attrs

    def create(self, validated_data):
        from hr.services.leaves import request_leave

        user = self.context["request"].user
        return request_leave(user, validated_data)


class LeaveDecisionSerializer(serializers.Serializer):
    reason = serializers.CharField(required=False, allow_blank=True, allow_null=True)


class PolicyRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = PolicyRule
        fields = (
            "id",
            "name",
            "rule_type",
            "threshold",
            "period_days",
            "action_type",
            "action_value",
            "is_active",
        )


class PolicyRuleSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = PolicyRule
        fields = ("id", "name", "rule_type")


class HRActionSerializer(serializers.ModelSerializer):
    employee = LeaveEmployeeSerializer(read_only=True)
    rule = PolicyRuleSummarySerializer(read_only=True)
    
    class Meta:
        model = HRAction
        fields = (
            "id",
            "employee",
            "rule",
            "action_type",
            "value",
            "reason",
            "period_start",
            "period_end",
            "attendance_record",
            "created_at",
        )


class PayrollPeriodSerializer(serializers.ModelSerializer):
    class Meta:
        model = PayrollPeriod
        fields = ("id", "year", "month", "status", "locked_at", "created_by")
        read_only_fields = ("id",)

    def validate(self, attrs):
        if "company" in self.initial_data:
            raise serializers.ValidationError({"company": "This field is not allowed."})
        request = self.context.get("request")
        company = request.user.company if request else None
        created_by = attrs.get("created_by")
        if created_by and company and created_by.company_id != company.id:
            raise serializers.ValidationError({"created_by": "User must belong to the same company."})
        return attrs

    def create(self, validated_data):
        request = self.context.get("request")
        validated_data["company"] = request.user.company
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data.pop("company", None)
        return super().update(instance, validated_data)


class SalaryStructureSerializer(serializers.ModelSerializer):
    class Meta:
        model = SalaryStructure
        fields = ("id", "employee", "basic_salary", "currency")
        read_only_fields = ("id",)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            self.fields["employee"].queryset = Employee.objects.filter(
                company=request.user.company
            )

    def validate(self, attrs):
        if "company" in self.initial_data:
            raise serializers.ValidationError({"company": "This field is not allowed."})
        request = self.context.get("request")
        company = request.user.company if request else None
        employee = attrs.get("employee")
        if employee and company and employee.company_id != company.id:
            raise serializers.ValidationError({"employee": "Employee must belong to the same company."})
        return attrs

    def create(self, validated_data):
        request = self.context.get("request")
        validated_data["company"] = request.user.company
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data.pop("company", None)
        return super().update(instance, validated_data)


class SalaryComponentSerializer(serializers.ModelSerializer):
    class Meta:
        model = SalaryComponent
        fields = ("id", "salary_structure", "name", "type", "amount", "is_recurring")
        read_only_fields = ("id",)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            self.fields["salary_structure"].queryset = SalaryStructure.objects.filter(
                company=request.user.company
            )

    def validate(self, attrs):
        if "company" in self.initial_data:
            raise serializers.ValidationError({"company": "This field is not allowed."})
        request = self.context.get("request")
        company = request.user.company if request else None
        salary_structure = attrs.get("salary_structure")
        if salary_structure and company and salary_structure.company_id != company.id:
            raise serializers.ValidationError(
                {"salary_structure": "Salary structure must belong to the same company."}
            )
        return attrs

    def create(self, validated_data):
        request = self.context.get("request")
        validated_data["company"] = request.user.company
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data.pop("company", None)
        return super().update(instance, validated_data)


class LoanAdvanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = LoanAdvance
        fields = (
            "id",
            "employee",
            "type",
            "principal_amount",
            "start_date",
            "installment_amount",
            "remaining_amount",
            "status",
        )
        read_only_fields = ("id",)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            self.fields["employee"].queryset = Employee.objects.filter(
                company=request.user.company
            )

    def validate(self, attrs):
        if "company" in self.initial_data:
            raise serializers.ValidationError({"company": "This field is not allowed."})
        request = self.context.get("request")
        company = request.user.company if request else None
        employee = attrs.get("employee")
        if employee and company and employee.company_id != company.id:
            raise serializers.ValidationError({"employee": "Employee must belong to the same company."})
        return attrs

    def create(self, validated_data):
        request = self.context.get("request")
        validated_data["company"] = request.user.company
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data.pop("company", None)
        return super().update(instance, validated_data)


class PayrollRunSerializer(serializers.ModelSerializer):
    class Meta:
        model = PayrollRun
        fields = (
            "id",
            "period",
            "employee",
            "status",
            "earnings_total",
            "deductions_total",
            "net_total",
            "generated_at",
            "generated_by",
        )
        read_only_fields = ("id",)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            company = request.user.company
            self.fields["period"].queryset = PayrollPeriod.objects.filter(company=company)
            self.fields["employee"].queryset = Employee.objects.filter(company=company)
            self.fields["generated_by"].queryset = User.objects.filter(company=company)

    def validate(self, attrs):
        if "company" in self.initial_data:
            raise serializers.ValidationError({"company": "This field is not allowed."})
        request = self.context.get("request")
        company = request.user.company if request else None
        period = attrs.get("period")
        if period and company and period.company_id != company.id:
            raise serializers.ValidationError({"period": "Period must belong to the same company."})
        employee = attrs.get("employee")
        if employee and company and employee.company_id != company.id:
            raise serializers.ValidationError({"employee": "Employee must belong to the same company."})
        generated_by = attrs.get("generated_by")
        if generated_by and company and generated_by.company_id != company.id:
            raise serializers.ValidationError(
                {"generated_by": "User must belong to the same company."}
            )
        return attrs

    def create(self, validated_data):
        request = self.context.get("request")
        validated_data["company"] = request.user.company
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data.pop("company", None)
        return super().update(instance, validated_data)


class PayrollLineSerializer(serializers.ModelSerializer):
    class Meta:
        model = PayrollLine
        fields = ("id", "payroll_run", "code", "name", "type", "amount", "meta")
        read_only_fields = ("id",)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            self.fields["payroll_run"].queryset = PayrollRun.objects.filter(
                company=request.user.company
            )

    def validate(self, attrs):
        if "company" in self.initial_data:
            raise serializers.ValidationError({"company": "This field is not allowed."})
        request = self.context.get("request")
        company = request.user.company if request else None
        payroll_run = attrs.get("payroll_run")
        if payroll_run and company and payroll_run.company_id != company.id:
            raise serializers.ValidationError(
                {"payroll_run": "Payroll run must belong to the same company."}
            )
        return attrs

    def create(self, validated_data):
        request = self.context.get("request")
        validated_data["company"] = request.user.company
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data.pop("company", None)
        return super().update(instance, validated_data)