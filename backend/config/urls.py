from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

from core.api_views.health import HealthView

urlpatterns = [
    path(settings.ADMIN_URL_PATH, admin.site.urls),    
    path("health/", HealthView.as_view(), name="health"),

    # OpenAPI    
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/", include("core.api_urls")),
    path("api/", include("hr.api_urls")),
    path("api/", include("accounting.api_urls")),
    path("api/", include("analytics.api_urls")),
    path("api/v1/", include("core.api_urls")),
    path("api/v1/", include("hr.api_urls")),
    path("api/v1/", include("accounting.api_urls")),
    path("api/v1/", include("analytics.api_urls")),

]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)