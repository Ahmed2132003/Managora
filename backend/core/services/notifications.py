from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from typing import Iterable
from urllib import error, request

from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger(__name__)


@dataclass
class NotificationMessage:
    subject: str
    body: str


def _is_enabled(flag_name: str, default: bool) -> bool:
    return bool(getattr(settings, flag_name, default))


def send_email_notification(*, to_email: str, subject: str, body: str) -> bool:
    if not to_email or not _is_enabled("NOTIFICATIONS_EMAIL_ENABLED", True):
        return False

    from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "no-reply@managora.local")
    try:
        sent = send_mail(
            subject=subject,
            message=body,
            from_email=from_email,
            recipient_list=[to_email],
            fail_silently=False,
        )
    except Exception:
        logger.exception("Failed to send email notification", extra={"to_email": to_email})
        return False
    return bool(sent)


def send_whatsapp_notification(*, to_number: str, body: str) -> bool:
    if not to_number or not _is_enabled("NOTIFICATIONS_WHATSAPP_ENABLED", False):
        return False

    api_url = getattr(settings, "WHATSAPP_API_URL", "")
    api_token = getattr(settings, "WHATSAPP_API_TOKEN", "")
    sender_id = getattr(settings, "WHATSAPP_SENDER_ID", "")

    if not api_url or not api_token:
        logger.warning("WhatsApp notifications enabled but API_URL/API_TOKEN are missing")
        return False

    payload = json.dumps(
        {
            "to": to_number,
            "message": body,
            "sender_id": sender_id,
        }
    ).encode("utf-8")

    req = request.Request(
        api_url,
        data=payload,
        method="POST",
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_token}",
        },
    )

    try:
        with request.urlopen(req, timeout=10) as response:
            return 200 <= response.status < 300
    except error.URLError:
        logger.exception(
            "Failed to send WhatsApp notification",
            extra={"to_number": to_number},
        )
        return False


def notify_user(user, *, message: NotificationMessage) -> dict[str, bool]:
    email_sent = send_email_notification(
        to_email=(user.email or "").strip(),
        subject=message.subject,
        body=message.body,
    )

    whatsapp_sent = send_whatsapp_notification(
        to_number=(getattr(user, "phone_number", "") or "").strip(),
        body=message.body,
    )

    return {"email": email_sent, "whatsapp": whatsapp_sent}


def notify_users(users: Iterable, *, message: NotificationMessage) -> None:
    for user in users:
        notify_user(user, message=message)