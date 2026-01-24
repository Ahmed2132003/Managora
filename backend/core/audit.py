from __future__ import annotations

from dataclasses import dataclass
from threading import local
from typing import Any

from django.utils import timezone


_state = local()


@dataclass
class AuditContext:
    user: Any | None = None
    user_id: int | None = None
    company_id: int | None = None
    ip_address: str | None = None
    user_agent: str | None = None
    request_id: str | None = None
    timestamp: str | None = None


def set_audit_context(
    user=None,
    ip_address: str | None = None,
    user_agent: str | None = None,
    request_id: str | None = None,
    company_id: int | None = None,
) -> None:
    _state.audit_context = AuditContext(
        user=user,
        user_id=getattr(user, "id", None),
        company_id=company_id,
        ip_address=ip_address,
        user_agent=user_agent or "",        
        request_id=request_id,
        timestamp=timezone.now().isoformat(),
    )
    

def get_audit_context() -> AuditContext | None:
    return getattr(_state, "audit_context", None)


def clear_audit_context() -> None:
    if hasattr(_state, "audit_context"):
        delattr(_state, "audit_context")


def get_client_ip(request) -> str | None:
    forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")