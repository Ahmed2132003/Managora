from django.db.models import Q
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import (
    ChatConversation,
    ChatMessage,
    ChatMessageAttachment,
    InAppNotification,
    PushSubscription,
)
from core.serializers import (
    ChatConversationSerializer,
    ChatMessageSerializer,
    InAppNotificationSerializer,
    PushSubscriptionSerializer,
    SendChatMessageSerializer,
)


def _get_or_create_conversation(*, sender, recipient):
    first_id, second_id = sorted([sender.id, recipient.id])
    conversation, _ = ChatConversation.objects.get_or_create(
        company=sender.company,
        participant_one_id=first_id,
        participant_two_id=second_id,
    )
    return conversation


class ChatConversationListView(generics.ListAPIView):
    serializer_class = ChatConversationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return ChatConversation.objects.filter(
            company=user.company,
        ).filter(
            Q(participant_one=user) | Q(participant_two=user)
        ).order_by("-updated_at")


class ChatMessageListView(generics.ListAPIView):
    serializer_class = ChatMessageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        conversation_id = self.kwargs["conversation_id"]
        qs = ChatMessage.objects.filter(
            conversation_id=conversation_id,
            company=user.company,
        ).filter(Q(sender=user) | Q(recipient=user)).order_by("id")

        after_id = self.request.query_params.get("after_id")
        if after_id and after_id.isdigit():
            qs = qs.filter(id__gt=int(after_id))

        qs.filter(recipient=user, is_read=False).update(is_read=True)
        return qs


class SendChatMessageView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = SendChatMessageSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)

        recipient = serializer.validated_data["recipient"]
        conversation = _get_or_create_conversation(sender=request.user, recipient=recipient)
        message = ChatMessage.objects.create(
            conversation=conversation,
            company=request.user.company,
            sender=request.user,
            recipient=recipient,
            body=serializer.validated_data["body"],
        )

        attachments = serializer.validated_data.get("attachments") or []
        for upload in attachments:
            ChatMessageAttachment.objects.create(
                message=message,
                file=upload,
                original_name=getattr(upload, "name", "attachment"),
                file_size=getattr(upload, "size", 0) or 0,
            )

        notification_body = message.body or "📎 Attachment"
        InAppNotification.objects.create(
            company=request.user.company,
            sender=request.user,
            recipient=recipient,
            message=message,
            title=f"New message from {request.user.username}",
            body=notification_body,
        )
        conversation.save(update_fields=["updated_at"])

        return Response(
            ChatMessageSerializer(message, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class NotificationListView(generics.ListAPIView):
    serializer_class = InAppNotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return InAppNotification.objects.filter(
            company=self.request.user.company,
            recipient=self.request.user,
        ).order_by("is_read", "-id")


class NotificationMarkReadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, notification_id):
        notification = InAppNotification.objects.filter(
            id=notification_id,
            recipient=request.user,
            company=request.user.company,
        ).first()
        if not notification:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        if not notification.is_read:
            notification.is_read = True
            notification.save(update_fields=["is_read"])
        return Response({"ok": True})


class PushSubscriptionUpsertView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = PushSubscriptionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        PushSubscription.objects.update_or_create(
            endpoint=data["endpoint"],
            defaults={
                "user": request.user,
                "p256dh": data["p256dh"],
                "auth": data["auth"],
                "user_agent": data.get("user_agent", ""),
            },
        )
        return Response({"ok": True}, status=status.HTTP_201_CREATED)