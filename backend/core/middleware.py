from core.audit import clear_audit_context, get_client_ip, set_audit_context


class AuditContextMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        set_audit_context(
            user=getattr(request, "user", None),
            ip_address=get_client_ip(request),
            user_agent=request.META.get("HTTP_USER_AGENT"),
        )
        try:
            response = self.get_response(request)
        finally:
            clear_audit_context()
        return response