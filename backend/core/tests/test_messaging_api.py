import tempfile

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.test import override_settings

from core.models import Company

User = get_user_model()


@override_settings(MEDIA_ROOT=tempfile.mkdtemp())
class MessagingApiTests(APITestCase):
    def setUp(self):
        self.company = Company.objects.create(name="MsgCo")
        self.user1 = User.objects.create_user(username="u1", password="pass12345", company=self.company)
        self.user2 = User.objects.create_user(username="u2", password="pass12345", company=self.company)

    def _login(self, username: str):
        response = self.client.post(
            reverse("token_obtain_pair"),
            {"username": username, "password": "pass12345"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access']}")

    def test_send_message_creates_notification_and_conversation(self):
        self._login("u1")
        send_response = self.client.post(
            reverse("chat-send-message"),
            {"recipient_id": self.user2.id, "body": "hello"},
            format="json",
        )
        self.assertEqual(send_response.status_code, status.HTTP_201_CREATED)

        self._login("u2")
        notifications_response = self.client.get(reverse("notifications"))
        self.assertEqual(notifications_response.status_code, status.HTTP_200_OK)
        self.assertEqual(notifications_response.data[0]["body"], "hello")

        conversations_response = self.client.get(reverse("chat-conversations"))
        self.assertEqual(conversations_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(conversations_response.data), 1)

    def test_message_incremental_fetch(self):
        self._login("u1")
        first = self.client.post(
            reverse("chat-send-message"),
            {"recipient_id": self.user2.id, "body": "m1"},
            format="json",
        )
        second = self.client.post(
            reverse("chat-send-message"),
            {"recipient_id": self.user2.id, "body": "m2"},
            format="json",
        )
        self.assertEqual(second.status_code, status.HTTP_201_CREATED)

        conversations_response = self.client.get(reverse("chat-conversations"))
        conversation_id = conversations_response.data[0]["id"]

        messages_response = self.client.get(
            reverse("chat-messages", kwargs={"conversation_id": conversation_id}),
            {"after_id": first.data["id"]},
        )
        self.assertEqual(messages_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(messages_response.data), 1)
        self.assertEqual(messages_response.data[0]["body"], "m2")

    def test_send_message_with_attachment(self):
        self._login("u1")
        upload = SimpleUploadedFile("note.txt", b"hello file", content_type="text/plain")
        response = self.client.post(
            reverse("chat-send-message"),
            {"recipient_id": self.user2.id, "body": "", "attachments": [upload]},
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(response.data["attachments"]), 1)
        self.assertEqual(response.data["attachments"][0]["original_name"], "note.txt")
