import time
import uuid

from django.utils.deprecation import MiddlewareMixin


class AuditContextMiddleware(MiddlewareMixin):
    """Attach request-scoped audit context attributes.

    We keep this middleware very defensive so it never breaks request handling.
    """

    def process_request(self, request):
        request.request_id = request.META.get("HTTP_X_REQUEST_ID") or str(uuid.uuid4())

        user = getattr(request, "user", None)
        if user and getattr(user, "is_authenticated", False):
            # Determine the active company for this request.
            company_id = getattr(user, "company_id", None)

            # Optional: allow superuser to override for debugging via header
            # Example header: X-Company-ID: 7
            if getattr(user, "is_superuser", False):
                hdr_company = request.META.get("HTTP_X_COMPANY_ID")
                if hdr_company:
                    try:
                        company_id = int(hdr_company)
                    except (TypeError, ValueError):
                        pass

            request.company_id = company_id
        else:
            request.company_id = None

        # Helpful for downstream usage (optional)
        request.actor_id = getattr(user, "id", None) if user and getattr(user, "is_authenticated", False) else None


class RequestLoggingMiddleware(MiddlewareMixin):
    """Lightweight request timing/logging middleware.

    Your project logger (core.logging.JsonFormatter) will pick up these fields if configured.
    This class must exist because it's referenced in settings.MIDDLEWARE.
    """

    def process_request(self, request):
        request._start_time = time.time()

    def process_response(self, request, response):
        try:
            start = getattr(request, "_start_time", None)
            if start is not None:
                latency_ms = (time.time() - start) * 1000.0
                response["X-Request-ID"] = getattr(request, "request_id", "")
                response["X-Latency-ms"] = f"{latency_ms:.2f}"
        except Exception:
            # Never break responses because of logging headers
            pass
        return response
