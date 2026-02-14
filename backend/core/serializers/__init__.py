"""Serializer package for core app."""

from core.serializers.auth import LoginSerializer
from core.serializers.companies import CompanySerializer
from core.serializers.messaging import (
    ChatConversationSerializer,
    ChatMessageSerializer,
    InAppNotificationSerializer,
    PushSubscriptionSerializer,
    SendChatMessageSerializer,
)

__all__ = [
    "CompanySerializer",
    "LoginSerializer",
    "ChatConversationSerializer",
    "ChatMessageSerializer",
    "InAppNotificationSerializer",
    "PushSubscriptionSerializer",
    "SendChatMessageSerializer",
]