from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import CopilotQueryLog
from core.permissions import user_has_permission
from core.serializers.copilot import CopilotQuerySerializer
from core.services.copilot import get_intent
from core.throttles import CopilotRateThrottle


class CopilotQueryView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [CopilotRateThrottle]
    
    def post(self, request):
        serializer = CopilotQuerySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        question = serializer.validated_data["question"]
        intent_code = serializer.validated_data["intent"]
        params = serializer.validated_data.get("params") or {}

        intent = get_intent(intent_code)
        if not intent:
            CopilotQueryLog.objects.create(
                company=request.user.company,
                user=request.user,
                question=question,
                intent=intent_code,
                input_payload=params,
                output_payload={"detail": "Unknown intent."},
                status=CopilotQueryLog.Status.ERROR,
            )
            return Response({"detail": "Unknown intent."}, status=status.HTTP_400_BAD_REQUEST)

        if not user_has_permission(request.user, intent.permission):
            CopilotQueryLog.objects.create(
                company=request.user.company,
                user=request.user,
                question=question,
                intent=intent_code,
                input_payload=params,
                output_payload={"detail": "Access denied."},
                status=CopilotQueryLog.Status.BLOCKED,
            )
            return Response(
                {"detail": "Access denied. Please contact your administrator."},
                status=status.HTTP_403_FORBIDDEN,
            )

        params_serializer = intent.params_serializer(data=params)
        if not params_serializer.is_valid():
            CopilotQueryLog.objects.create(
                company=request.user.company,
                user=request.user,
                question=question,
                intent=intent_code,
                input_payload=params,
                output_payload=params_serializer.errors,
                status=CopilotQueryLog.Status.ERROR,
            )
            return Response(params_serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            response_payload = intent.handler(request.user, params_serializer.validated_data)
        except Exception as exc:
            CopilotQueryLog.objects.create(
                company=request.user.company,
                user=request.user,
                question=question,
                intent=intent_code,
                input_payload=params,
                output_payload={"detail": str(exc)},
                status=CopilotQueryLog.Status.ERROR,
            )
            raise

        CopilotQueryLog.objects.create(
            company=request.user.company,
            user=request.user,
            question=question,
            intent=intent_code,
            input_payload=params,
            output_payload=response_payload,
            status=CopilotQueryLog.Status.OK,
        )
        return Response(response_payload)