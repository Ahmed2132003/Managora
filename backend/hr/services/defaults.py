from __future__ import annotations

from datetime import time

from hr.models import Employee, Shift

DEFAULT_SHIFTS = [
    {
        "name": "Day Shift",
        "start_time": time(9, 0),
        "end_time": time(17, 0),
        "grace_minutes": 0,
    },
    {
        "name": "Early Shift",
        "start_time": time(3, 0),
        "end_time": time(11, 0),
        "grace_minutes": 0,
    },
]


def ensure_default_shifts(company):
    if Shift.objects.filter(company=company).exists():
        return []

    shifts = [
        Shift(
            company=company,
            name=shift["name"],
            start_time=shift["start_time"],
            end_time=shift["end_time"],
            grace_minutes=shift["grace_minutes"],
            is_active=True,
        )
        for shift in DEFAULT_SHIFTS
    ]
    return Shift.objects.bulk_create(shifts)


def get_default_shift(company):
    preferred = Shift.objects.filter(
        company=company,
        start_time=time(9, 0),
        end_time=time(17, 0),
    ).order_by("id").first()
    if preferred:
        return preferred
    return Shift.objects.filter(company=company).order_by("start_time", "id").first()


def get_company_manager(company):
    return (
        Employee.objects.filter(company=company, user__roles__name__iexact="manager")
        .distinct()
        .order_by("id")
        .first()
    )
