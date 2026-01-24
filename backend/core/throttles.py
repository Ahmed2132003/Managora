from rest_framework.throttling import SimpleRateThrottle, UserRateThrottle


class LoginRateThrottle(SimpleRateThrottle):
    scope = "login"

    def get_cache_key(self, request, view):
        username = request.data.get("username") if hasattr(request, "data") else None
        ident = username or self.get_ident(request)
        if not ident:
            return None
        return self.cache_format % {"scope": self.scope, "ident": ident}

class CopilotRateThrottle(UserRateThrottle):
    scope = "copilot"


class ExportRateThrottle(UserRateThrottle):
    scope = "export"