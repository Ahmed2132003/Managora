from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.serializers.me import MeSerializer

class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        company = getattr(user, "company", None)

        if company is None:
            # المفروض مايحصلش لو مرحلة D مظبوطة، بس بنعمل guard
            return Response({"detail": "User is not linked to a company."}, status=400)

        data = {
            "user": user,
            "company": company,
        }
        serializer = MeSerializer(data)
        return Response(serializer.data)
