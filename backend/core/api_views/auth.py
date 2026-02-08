from drf_spectacular.utils import extend_schema
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView

from core.serializers.auth import LoginSerializer
from core.throttles import LoginRateThrottle


@extend_schema(
    tags=["Auth"],    
    summary="Login",
    description="Obtain access and refresh tokens using username/password credentials.",
    request=LoginSerializer,
    responses={200: LoginSerializer},    
)
class LoginView(TokenObtainPairView):
    serializer_class = LoginSerializer    
    permission_classes = [AllowAny]
    throttle_classes = [LoginRateThrottle]