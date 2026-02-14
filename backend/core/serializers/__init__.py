"""Serializer package for core app."""

from core.serializers.auth import LoginSerializer
from core.serializers.companies import CompanySerializer
from core.serializers.messaging import (    
    ChatConversationSerializer,
    ChatGroupSerializer,
    ChatMessageSerializer,
    CreateChatGroupSerializer,
    GroupMemberUpsertSerializer,
    InAppNotificationSerializer,
    PushSubscriptionSerializer,
    SendChatMessageSerializer,
    UpdateChatGroupSerializer,
)

__all__ = [
    "CompanySerializer",
    "LoginSerializer",
    "ChatConversationSerializer",
    "ChatGroupSerializer",
    "ChatMessageSerializer",
    "CreateChatGroupSerializer",
    "GroupMemberUpsertSerializer",
    "InAppNotificationSerializer",
    "PushSubscriptionSerializer",
    "SendChatMessageSerializer",
    "UpdateChatGroupSerializer",
]