from rest_framework import serializers

from core.models import (
    ChatConversation,
    ChatGroup,
    ChatGroupMembership,
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
            "group",
            "body",
            "is_read",
            "created_at",
            "attachments",
        ]
        read_only_fields = ["id", "conversation", "sender", "recipient", "group", "is_read", "created_at"]


class ChatConversationSerializer(serializers.ModelSerializer):
    type = serializers.SerializerMethodField()
    other_user_id = serializers.SerializerMethodField()
    other_user_name = serializers.SerializerMethodField()
    group_id = serializers.IntegerField(source="group.id", read_only=True)
    group_name = serializers.CharField(source="group.name", read_only=True)
    last_message = serializers.SerializerMethodField()

    class Meta:
        model = ChatConversation
        fields = [
            "id",
            "type",
            "other_user_id",
            "other_user_name",
            "group_id",
            "group_name",
            "updated_at",
            "last_message",
        ]

    def _other_user(self, obj):
        user = self.context["request"].user
        return obj.participant_two if obj.participant_one_id == user.id else obj.participant_one

    def get_type(self, obj):
        return "group" if obj.group_id else "direct"

    def get_other_user_id(self, obj):
        if obj.group_id:
            return None
        return self._other_user(obj).id

    def get_other_user_name(self, obj):
        if obj.group_id:
            return None
        return self._other_user(obj).username

    def get_last_message(self, obj):
        message = obj.messages.order_by("-id").first()
        return ChatMessageSerializer(message, context=self.context).data if message else None


class ChatGroupMembershipSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = ChatGroupMembership
        fields = ["id", "user", "user_name", "is_admin", "created_at"]
        read_only_fields = fields


class ChatGroupSerializer(serializers.ModelSerializer):
    members = serializers.SerializerMethodField()

    class Meta:
        model = ChatGroup
        fields = [
            "id",
            "name",
            "description",
            "is_private",
            "created_by",
            "created_at",
            "updated_at",
            "members",
        ]
        read_only_fields = ["created_by", "created_at", "updated_at", "members"]

    def get_members(self, obj):
        memberships = obj.memberships.select_related("user").order_by("user__username")
        return ChatGroupMembershipSerializer(memberships, many=True).data


class SendChatMessageSerializer(serializers.Serializer):
    recipient_id = serializers.IntegerField(required=False)
    group_id = serializers.IntegerField(required=False)
    body = serializers.CharField(max_length=5000, allow_blank=True, default="")
    attachments = serializers.ListField(
        child=serializers.FileField(),
        required=False,
        allow_empty=True,
    )

    def validate(self, attrs):
        request = self.context["request"]
        recipient_id = attrs.get("recipient_id")
        group_id = attrs.get("group_id")
        if bool(recipient_id) == bool(group_id):
            raise serializers.ValidationError({"detail": "Provide either recipient_id or group_id."})

        if recipient_id:
            recipient = User.objects.filter(id=recipient_id, company=request.user.company).first()
            if not recipient:
                raise serializers.ValidationError({"recipient_id": "Invalid recipient."})
            if recipient.id == request.user.id:
                raise serializers.ValidationError({"recipient_id": "Cannot send message to yourself."})
            attrs["recipient"] = recipient

        if group_id:
            group = ChatGroup.objects.filter(id=group_id, company=request.user.company).first()
            if not group:
                raise serializers.ValidationError({"group_id": "Invalid group."})
            is_member = ChatGroupMembership.objects.filter(group=group, user=request.user).exists()
            if not is_member:
                raise serializers.ValidationError({"group_id": "You are not a member of this group."})
            attrs["group"] = group

        body = (attrs.get("body") or "").strip()
        attachments = attrs.get("attachments") or []
        if not body and not attachments:
            raise serializers.ValidationError({"body": "Message body or attachment is required."})
        attrs["body"] = body
        return attrs


class CreateChatGroupSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=150)
    description = serializers.CharField(required=False, allow_blank=True, default="")
    is_private = serializers.BooleanField(default=False)
    member_ids = serializers.ListField(child=serializers.IntegerField(), required=False, allow_empty=True, default=list)


class UpdateChatGroupSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=150, required=False)
    description = serializers.CharField(required=False, allow_blank=True)
    is_private = serializers.BooleanField(required=False)


class GroupMemberUpsertSerializer(serializers.Serializer):
    user_id = serializers.IntegerField()
    is_admin = serializers.BooleanField(default=False)


class InAppNotificationSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source="sender.username", read_only=True)

    class Meta:
        model = InAppNotification
        fields = ["id", "title", "body", "sender", "sender_name", "message", "is_read", "created_at"]


class PushSubscriptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = PushSubscription
        fields = ["endpoint", "p256dh", "auth", "user_agent"]