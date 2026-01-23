from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import SetupTemplate, TemplateApplyLog
from core.permissions import is_admin_user
from core.serializers.setup_serializers import (
    CompanySetupStateSerializer,
    SetupTemplateSerializer,
)
from core.services.setup_templates import (
    apply_template_bundle,
    build_template_overview,
    load_template_bundle,
)


class SetupTemplateListView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Setup"],
        summary="List setup templates",
        responses={200: SetupTemplateSerializer(many=True)},
    )
    def get(self, request):
        templates = SetupTemplate.objects.filter(is_active=True).order_by("name_en")
        response_data = []
        for template in templates:
            bundle = load_template_bundle(template.code)
            serialized = SetupTemplateSerializer(template).data
            serialized["overview"] = build_template_overview(bundle)
            response_data.append(serialized)
        return Response(response_data, status=status.HTTP_200_OK)


class ApplySetupTemplateView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Setup"],
        summary="Apply setup template",
    )
    def post(self, request):
        if not is_admin_user(request.user):
            return Response(
                {"detail": "You do not have permission to perform this action."},
                status=status.HTTP_403_FORBIDDEN,
            )

        template_code = request.data.get("template_code")
        if not template_code:
            return Response(
                {"detail": "template_code is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        template = SetupTemplate.objects.filter(code=template_code, is_active=True).first()
        if not template:
            return Response(
                {"detail": "Template not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        existing_log = TemplateApplyLog.objects.filter(
            company=request.user.company,
            template_code=template.code,
            template_version=template.version,
            status=TemplateApplyLog.Status.SUCCEEDED,
        ).first()
        if existing_log:
            setup_state = getattr(request.user.company, "setup_state", None)
            state_data = (
                CompanySetupStateSerializer(setup_state).data if setup_state else None
            )
            return Response(
                {
                    "status": "already_applied",
                    "detail": "Template already applied.",
                    "template_version": template.version,
                    "setup_state": state_data,
                },
                status=status.HTTP_200_OK,
            )

        log = TemplateApplyLog.objects.create(
            company=request.user.company,
            template_code=template.code,
            template_version=template.version,
            status=TemplateApplyLog.Status.STARTED,
        )

        try:
            bundle = load_template_bundle(template.code)
            setup_state = apply_template_bundle(request.user.company, bundle)
        except Exception as exc:  # noqa: BLE001
            log.status = TemplateApplyLog.Status.FAILED
            log.error = str(exc)
            log.save(update_fields=["status", "error", "updated_at"])
            return Response(
                {
                    "status": "failed",
                    "detail": "Template apply failed.",
                    "error": log.error,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        log.status = TemplateApplyLog.Status.SUCCEEDED
        log.save(update_fields=["status", "updated_at"])

        return Response(
            {
                "status": "succeeded",
                "template_version": template.version,
                "setup_state": CompanySetupStateSerializer(setup_state).data,
            },
            status=status.HTTP_201_CREATED,
        )