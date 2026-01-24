import logging
import time
from uuid import uuid4

from core.audit import clear_audit_context, get_audit_context, get_client_ip, set_audit_context


class AuditContextMiddleware:    
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request_id = request.META.get("HTTP_X_REQUEST_ID") or str(uuid4())
        set_audit_context(
            user=getattr(request, "user", None),
            ip_address=get_client_ip(request),
            user_agent=request.META.get("HTTP_USER_AGENT"),
            request_id=request_id,
        )
        try:
            response = self.get_response(request)
        finally:
            clear_audit_context()
        return response


class RequestLoggingMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
        self.logger = logging.getLogger("managora.request")

    def __call__(self, request):
        start_time = time.monotonic()
        response = self.get_response(request)
        latency_ms = round((time.monotonic() - start_time) * 1000, 2)
        audit_context = get_audit_context()
        request_id = audit_context.request_id if audit_context else None
        response["X-Request-ID"] = request_id or ""
        self.logger.info(
            "request_completed",
            extra={
                "request_id": request_id,
                "company_id": audit_context.company_id if audit_context else None,
                "user_id": audit_context.user_id if audit_context else None,
                "method": request.method,
                "endpoint": request.path,
                "status_code": response.status_code,
                "latency_ms": latency_ms,
            },
        )
        return response