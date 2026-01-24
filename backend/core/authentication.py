from rest_framework_simplejwt.authentication import JWTAuthentication

from core.audit import get_audit_context, get_client_ip, set_audit_context


class AuditJWTAuthentication(JWTAuthentication):
    def authenticate(self, request):
        result = super().authenticate(request)
        if result:
            user, token = result
            audit_context = get_audit_context()
            set_audit_context(
                user=user,
                ip_address=audit_context.ip_address if audit_context else get_client_ip(request),
                user_agent=audit_context.user_agent if audit_context else request.META.get("HTTP_USER_AGENT"),
                request_id=audit_context.request_id if audit_context else None,
                company_id=getattr(user, "company_id", None),
            )
            return user, token
        return result