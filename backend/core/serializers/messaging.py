from rest_framework import serializers

from core.models import (
    ChatConversation,
    ChatMessage,
    ChatMessageAttachment,
    InAppNotification,
    PushSubscription,
    User,
)


class ChatMessageAttachmentSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = ChatMessageAttachment
        fields = ["id", "file", "file_url", "original_name", "file_size", "created_at"]
        read_only_fields = fields

    def get_file_url(self, obj):
        request = self.context.get("request")
        if not obj.file:
            return ""
        url = obj.file.url
        return request.build_absolute_uri(url) if request else url


class ChatMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source="sender.username", read_only=True)
    attachments = ChatMessageAttachmentSerializer(many=True, read_only=True)

    class Meta:
        model = ChatMessage
        fields = [
            "id",
            "conversation",
            "sender",
            "sender_name",
            "recipient",
            "body",
            "is_read",
            "created_at",
            "attachments",
        ]
        read_only_fields = ["id", "conversation", "sender", "recipient", "is_read", "created_at"]


class ChatConversationSerializer(serializers.ModelSerializer):
    other_user_id = serializers.SerializerMethodField()
    other_user_name = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()

    class Meta:
        model = ChatConversation
        fields = ["id", "other_user_id", "other_user_name", "updated_at", "last_message"]

    def _other_user(self, obj):
        user = self.context["request"].user
        return obj.participant_two if obj.participant_one_id == user.id else obj.participant_one

    def get_other_user_id(self, obj):
        return self._other_user(obj).id

    def get_other_user_name(self, obj):
        return self._other_user(obj).username

    def get_last_message(self, obj):
        message = obj.messages.order_by("-id").first()
        return ChatMessageSerializer(message, context=self.context).data if message else None


class SendChatMessageSerializer(serializers.Serializer):
    recipient_id = serializers.IntegerField()
    body = serializers.CharField(max_length=5000, allow_blank=True, default="")
    attachments = serializers.ListField(
        child=serializers.FileField(),
        required=False,
        allow_empty=True,
    )

    def validate(self, attrs):
        request = self.context["request"]
        recipient = User.objects.filter(id=attrs["recipient_id"], company=request.user.company).first()
        if not recipient:
            raise serializers.ValidationError({"recipient_id": "Invalid recipient."})
        if recipient.id == request.user.id:
            raise serializers.ValidationError({"recipient_id": "Cannot send message to yourself."})
        body = (attrs.get("body") or "").strip()
        attachments = attrs.get("attachments") or []
        if not body and not attachments:
            raise serializers.ValidationError({"body": "Message body or attachment is required."})
        attrs["body"] = body
        attrs["recipient"] = recipient
        return attrs


class InAppNotificationSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source="sender.username", read_only=True)

    class Meta:
        model = InAppNotification
        fields = ["id", "title", "body", "sender", "sender_name", "message", "is_read", "created_at"]


class PushSubscriptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = PushSubscription
        fields = ["endpoint", "p256dh", "auth", "user_agent"]