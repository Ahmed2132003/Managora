from __future__ import annotations

from django.contrib.auth import get_user_model

from core.services.notifications import NotificationMessage, notify_users

from hr.models import LeaveRequest

User = get_user_model()


IMPORTANT_ROLES = ("manager", "hr")


def _important_role_users(company_id: int):
    return User.objects.filter(
        company_id=company_id,
        is_active=True,
        roles__name__in=IMPORTANT_ROLES,
    ).distinct()


def send_role_aware_leave_notifications(*, event: str, leave_request: LeaveRequest, actor) -> None:
    employee_user = leave_request.employee.user
    leave_range = f"{leave_request.start_date} → {leave_request.end_date}"

    if event == "submitted":
        recipients = _important_role_users(leave_request.company_id)
        message = NotificationMessage(
            subject="Leave request submitted",
            body=(
                f"{leave_request.employee.full_name} submitted leave request ({leave_range}) "
                f"for {leave_request.days} day(s)."
            ),
        )
        notify_users(recipients, message=message)
        return

    if not employee_user:
        return

    if event == "approved":
        message = NotificationMessage(
            subject="Leave request approved",
            body=(
                f"Your leave request ({leave_range}) was approved by "
                f"{actor.get_full_name() or actor.username}."
            ),
        )
        notify_users([employee_user], message=message)
        return

    if event == "rejected":
        message = NotificationMessage(
            subject="Leave request rejected",
            body=(
                f"Your leave request ({leave_range}) was rejected by "
                f"{actor.get_full_name() or actor.username}."
                f" Reason: {leave_request.reject_reason or 'No reason provided.'}"
            ),
        )
        notify_users([employee_user], message=message)