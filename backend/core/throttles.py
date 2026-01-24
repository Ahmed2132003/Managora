from django.contrib.auth import get_user_model
from rest_framework.throttling import SimpleRateThrottle, UserRateThrottle


class LoginRateThrottle(SimpleRateThrottle):
    scope = "login"

    def get_cache_key(self, request, view):
        username = None
        if hasattr(request, "data"):
            username_field = get_user_model().USERNAME_FIELD
            username = request.data.get(username_field) or request.data.get("username")
        ident = username or self.get_ident(request) or "anonymous"
        if not ident:
            return None
        return self.cache_format % {"scope": self.scope, "ident": ident}
    
class CopilotRateThrottle(UserRateThrottle):
    scope = "copilot"


class ExportRateThrottle(UserRateThrottle):
    scope = "export"