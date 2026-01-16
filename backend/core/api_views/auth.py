from drf_spectacular.utils import extend_schema
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView


@extend_schema(
    tags=["Auth"],
    summary="Login",
    description="Obtain access and refresh tokens using username/password credentials.",
    request=TokenObtainPairSerializer,
    responses={200: TokenObtainPairSerializer},
)
class LoginView(TokenObtainPairView):
    serializer_class = TokenObtainPairSerializer