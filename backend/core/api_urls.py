from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from core.api_views.auth import LoginView
from core.api_views.me import MeView

urlpatterns = [
    # Auth
    path("auth/login/", LoginView.as_view(), name="token_obtain_pair"),
    path("auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),

    # Me
    path("me/", MeView.as_view(), name="me"),
]