from django.conf import settings
from django.core.cache import cache
from django.db import connection
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView


class HealthView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        db_ok = self._check_db()
        cache_ok = self._check_cache()
        redis_configured = bool(settings.REDIS_URL)
        return Response(
            {
                "status": "ok" if db_ok and cache_ok else "degraded",
                "db": "ok" if db_ok else "error",
                "cache": "ok" if cache_ok else "error",
                "redis": "ok" if cache_ok else "error" if redis_configured else "not_configured",
                "version": settings.APP_VERSION,
                "build": settings.BUILD_SHA,
                "environment": settings.APP_ENVIRONMENT,
            }
        )

    @staticmethod
    def _check_db() -> bool:
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                cursor.fetchone()
            return True
        except Exception:
            return False

    @staticmethod
    def _check_cache() -> bool:
        try:
            cache.set("healthcheck", "ok", timeout=1)
            return cache.get("healthcheck") == "ok"
        except Exception:
            return False