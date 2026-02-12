import logging

from django.conf import settings
from django.http import JsonResponse
from django.shortcuts import render
from django.utils.deprecation import MiddlewareMixin

logger = logging.getLogger("managora.request")


class GlobalExceptionMiddleware(MiddlewareMixin):
    """Normalize unexpected exceptions into user-friendly responses."""

    def process_exception(self, request, exception):
        request_id = getattr(request, "request_id", "")
        log_payload = {
            "request_id": request_id,
            "path": request.path,
            "method": request.method,
        }

        if settings.DEBUG:
            logger.exception("Unhandled exception", extra=log_payload)
        else:
            logger.error(
                "Unhandled exception: %s",
                exception.__class__.__name__,
                extra=log_payload,
            )

        if _is_api_request(request):
            return JsonResponse(
                {
                    "detail": "حدث خطأ غير متوقع. حاول مرة أخرى بعد قليل.",
                    "request_id": request_id,
                },
                status=500,
            )

        context = {"request_id": request_id}
        return render(request, "500.html", context=context, status=500)


def _is_api_request(request) -> bool:
    accept = request.headers.get("Accept", "")
    return request.path.startswith("/api/") or "application/json" in accept.lower()  