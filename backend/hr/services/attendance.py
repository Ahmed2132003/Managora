from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from math import atan2, cos, radians, sin, sqrt
from typing import Any, Optional

from django.core import signing
from django.utils import timezone
from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied

from hr.models import AttendanceRecord, Employee, Shift, WorkSite
from hr.services.policies import evaluate_attendance_record


QR_TOKEN_SALT = "attendance.qr"


@dataclass(frozen=True)
class LocationPayload:
    lat: float
    lng: float


@dataclass(frozen=True)
class QrWindow:
    start: datetime
    end: datetime
    worksite: WorkSite


def calculate_late(record_date, shift: Shift, now: datetime) -> int:    
    expected_start = timezone.make_aware(
        datetime.combine(record_date, shift.start_time), timezone.get_current_timezone()
    )
    grace_minutes = shift.grace_minutes or 0
    grace_delta = timedelta(minutes=grace_minutes)
    if now > expected_start + grace_delta:
        return int((now - expected_start - grace_delta).total_seconds() // 60)
    return 0


def calculate_early_leave(record_date, shift: Shift, now: datetime) -> int:
    expected_end = timezone.make_aware(
        datetime.combine(record_date, shift.end_time), timezone.get_current_timezone()
    )
    grace_minutes = shift.early_leave_grace_minutes or 0
    grace_delta = timedelta(minutes=grace_minutes)
    if now < expected_end - grace_delta:
        return int((expected_end - grace_delta - now).total_seconds() // 60)
    return 0


def validate_location(worksite: WorkSite, lat: float, lng: float) -> None:
    earth_radius_m = 6_371_000
    lat1 = radians(float(worksite.lat))
    lng1 = radians(float(worksite.lng))
    lat2 = radians(float(lat))
    lng2 = radians(float(lng))

    dlat = lat2 - lat1
    dlng = lng2 - lng1
    a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlng / 2) ** 2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))
    distance = earth_radius_m * c

    if distance > worksite.radius_meters:
        raise PermissionDenied("Outside allowed location")


def _get_employee(user, employee_id: int) -> Employee:
    try:
        return Employee.objects.get(id=employee_id, company=user.company)
    except Employee.DoesNotExist as exc:
        raise serializers.ValidationError({"employee": "Employee not found."}) from exc


def _get_employee_shift(employee: Employee) -> Shift:
    if not employee.shift_id:
        raise serializers.ValidationError({"shift": "Employee must be assigned to a shift."})
    return employee.shift


def _get_location_payload(payload: dict[str, Any]) -> Optional[LocationPayload]:
    lat = payload.get("lat")
    lng = payload.get("lng")
    if lat is None or lng is None:
        return None
    return LocationPayload(lat=float(lat), lng=float(lng))


def _ensure_shift(payload: dict[str, Any]) -> Shift:
    shift = payload.get("shift")
    if not shift:
        raise serializers.ValidationError({"shift": "Shift is required."})
    return shift


def _ensure_method(payload: dict[str, Any]) -> str:
    method = payload.get("method")
    if not method:
        raise serializers.ValidationError({"method": "Method is required."})
    return method


def _validate_gps(payload: dict[str, Any]) -> LocationPayload:
    location = _get_location_payload(payload)
    if not location:
        raise serializers.ValidationError({"location": "lat/lng is required for GPS."})

    worksite = payload.get("worksite")
    if not worksite:
        raise serializers.ValidationError({"worksite": "Worksite is required for GPS."})
    validate_location(worksite, location.lat, location.lng)
    return location


def _validate_qr_location(payload: dict[str, Any], worksite: WorkSite) -> LocationPayload:
    location = _get_location_payload(payload)
    if not location:
        raise serializers.ValidationError({"location": "lat/lng is required for QR."})
    validate_location(worksite, location.lat, location.lng)
    return location


def _ensure_company_qr_settings(company) -> tuple[WorkSite, time, time]:
    if not company.attendance_qr_worksite_id:
        raise serializers.ValidationError(
            {"qr_token": "Company QR worksite is not configured."}
        )
    if not company.attendance_qr_start_time or not company.attendance_qr_end_time:
        raise serializers.ValidationError(
            {"qr_token": "Company QR schedule is not configured."}
        )
    return (
        company.attendance_qr_worksite,
        company.attendance_qr_start_time,
        company.attendance_qr_end_time,
    )


def _get_qr_window(company, issued_for: date) -> QrWindow:
    worksite, start_time, end_time = _ensure_company_qr_settings(company)
    tz = timezone.get_current_timezone()
    start_at = timezone.make_aware(datetime.combine(issued_for, start_time), tz)
    end_at = timezone.make_aware(datetime.combine(issued_for, end_time), tz)
    if end_time <= start_time:
        end_at += timedelta(days=1)
    return QrWindow(start=start_at, end=end_at, worksite=worksite)


def generate_qr_token(
    user,
) -> dict[str, Any]:
    issued_for = timezone.localdate()
    window = _get_qr_window(user.company, issued_for)

    payload = {
        "company_id": user.company_id,
        "worksite_id": window.worksite.id,
        "issued_for": issued_for.isoformat(),
    }
    token = signing.dumps(payload, salt=QR_TOKEN_SALT)
    return {
        "token": token,
        "valid_from": window.start,
        "valid_until": window.end,
        "worksite_id": window.worksite.id,
    }


def _parse_issued_for(value: str | None) -> date:
    if not value:
        raise serializers.ValidationError({"qr_token": "Invalid QR token."})
    return date.fromisoformat(value)


def _resolve_qr_payload(payload: dict[str, Any], company) -> WorkSite:
    token = payload.get("qr_token")
    if not token:
        raise serializers.ValidationError({"qr_token": "QR token is required."})
    
    try:
        data = signing.loads(token, salt=QR_TOKEN_SALT)
    except signing.BadSignature as exc:
        raise serializers.ValidationError({"qr_token": "Invalid QR token."}) from exc

    if data.get("company_id") != company.id:
        raise serializers.ValidationError({"qr_token": "QR token not valid for company."})

    worksite_id = data.get("worksite_id")
    issued_for = _parse_issued_for(data.get("issued_for"))
    if not worksite_id:
        raise serializers.ValidationError({"qr_token": "Invalid QR token payload."})

    window = _get_qr_window(company, issued_for)
    if window.worksite.id != worksite_id:
        raise serializers.ValidationError({"qr_token": "QR token not valid for company."})
    now = timezone.now()
    if now < window.start:
        raise serializers.ValidationError({"qr_token": "QR token not active yet."})
    if now > window.end:
        raise serializers.ValidationError({"qr_token": "QR token expired."})

    payload["worksite"] = window.worksite
    return window.worksite


def check_in(user, employee_id: int, payload: dict[str, Any]) -> AttendanceRecord:
    method = _ensure_method(payload)    
    now = timezone.now()
    record_date = timezone.localdate(now)
    
    employee = _get_employee(user, employee_id)
    existing_record = AttendanceRecord.objects.filter(
        company=user.company, employee=employee, date=record_date
    ).first()
    if existing_record and existing_record.check_in_time:
        raise serializers.ValidationError("Already checked in for today.")

    if method == AttendanceRecord.Method.QR:
        shift = _get_employee_shift(employee)
        worksite = _resolve_qr_payload(payload, user.company)
    else:
        shift = _ensure_shift(payload)

    location = None
    if method == AttendanceRecord.Method.GPS:
        location = _validate_gps(payload)
    elif method == AttendanceRecord.Method.QR:
        location = _validate_qr_location(payload, worksite)
    else:
        location = _get_location_payload(payload)
                
    late_minutes = calculate_late(record_date, shift, now)
    status = (
        AttendanceRecord.Status.LATE
        if late_minutes > 0
        else AttendanceRecord.Status.PRESENT
    )

    if existing_record is None:
        record = AttendanceRecord.objects.create(
            company=user.company,
            employee=employee,
            date=record_date,
            check_in_time=now,
            check_in_lat=location.lat if location else None,
            check_in_lng=location.lng if location else None,
            method=method,
            status=status,
            late_minutes=late_minutes,
        )
        evaluate_attendance_record(record)
        return record

    existing_record.check_in_time = now
    existing_record.check_in_lat = location.lat if location else None    
    existing_record.check_in_lng = location.lng if location else None
    existing_record.method = method
    existing_record.status = status
    existing_record.late_minutes = late_minutes
    existing_record.save(
        update_fields=[
            "check_in_time",
            "check_in_lat",
            "check_in_lng",
            "method",
            "status",
            "late_minutes",
            "updated_at",
        ]
    )
    evaluate_attendance_record(existing_record)
    return existing_record


def check_out(user, employee_id: int, payload: dict[str, Any]) -> AttendanceRecord:
    method = _ensure_method(payload)
    now = timezone.now()
    record_date = timezone.localdate(now)

    employee = _get_employee(user, employee_id)
    record = AttendanceRecord.objects.filter(
        company=user.company, employee=employee, date=record_date
    ).first()
    if not record or not record.check_in_time or record.check_out_time:
        raise serializers.ValidationError("No open check-in for today.")

    if method == AttendanceRecord.Method.QR:
        shift = _get_employee_shift(employee)
        worksite = _resolve_qr_payload(payload, user.company)
    else:
        shift = _ensure_shift(payload)
    location = None
    if method == AttendanceRecord.Method.GPS:
        location = _validate_gps(payload)
    elif method == AttendanceRecord.Method.QR:
        location = _validate_qr_location(payload, worksite)
    else:
        location = _get_location_payload(payload)
        
    early_leave_minutes = calculate_early_leave(record_date, shift, now)
    status = record.status
    if early_leave_minutes > 0 and status != AttendanceRecord.Status.LATE:
        status = AttendanceRecord.Status.EARLY_LEAVE

    record.check_out_time = now
    record.check_out_lat = location.lat if location else None
    record.check_out_lng = location.lng if location else None
    record.method = method
    record.status = status
    record.early_leave_minutes = early_leave_minutes
    record.save(
        update_fields=[
            "check_out_time",
            "check_out_lat",
            "check_out_lng",
            "method",
            "status",
            "early_leave_minutes",
            "updated_at",
        ]
    )
    return record