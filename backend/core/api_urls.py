from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from core.api_views.auth import LoginView
from core.api_views.audit import AuditLogListView
from core.api_views.copilot import CopilotQueryView
from core.api_views.me import MeView
from core.api_views.roles import RoleListView
from core.api_views.setup import ApplySetupTemplateView, SetupTemplateListView
from core.api_views.users import UsersViewSet

router = DefaultRouter()
router.register("users", UsersViewSet, basename="user")

urlpatterns = [
    path("", include(router.urls)),
    # Auth
    path("auth/login/", LoginView.as_view(), name="token_obtain_pair"),
    path("auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    
    # Me
    path("me/", MeView.as_view(), name="me"),

    # Audit
    path("audit/logs/", AuditLogListView.as_view(), name="audit-logs"),

    # Roles
    path("roles/", RoleListView.as_view(), name="roles"),

    # Copilot
    path("copilot/query/", CopilotQueryView.as_view(), name="copilot-query"),

    # Setup    
    path("setup/templates/", SetupTemplateListView.as_view(), name="setup-templates"),
    path("setup/apply-template/", ApplySetupTemplateView.as_view(), name="setup-apply-template"),
]