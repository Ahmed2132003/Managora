from rest_framework.throttling import SimpleRateThrottle, UserRateThrottle


class LoginRateThrottle(SimpleRateThrottle):
    scope = "login"

    def get_cache_key(self, request, view):
        return self.cache_format % {
            "scope": self.scope,
            "ident": self.get_ident(request),
        }


class CopilotRateThrottle(UserRateThrottle):
    scope = "copilot"


class ExportRateThrottle(UserRateThrottle):
    scope = "export"