from django.conf import settings
from django.test import SimpleTestCase
from django.urls import reverse


class AdminUrlConfigTests(SimpleTestCase):
    def test_admin_url_is_customized(self):
        self.assertEqual(settings.ADMIN_URL_PATH, "managora_super/")

    def test_admin_reverse_uses_custom_path(self):
        self.assertEqual(reverse("admin:index"), "/managora_super/")