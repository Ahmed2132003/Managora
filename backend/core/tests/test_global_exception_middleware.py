from django.test import SimpleTestCase, override_settings


@override_settings(ROOT_URLCONF="core.tests.test_urls_exceptions")
class GlobalExceptionMiddlewareTests(SimpleTestCase):
    def test_api_exception_returns_friendly_json_message(self):
        response = self.client.get("/api/test-boom/", HTTP_ACCEPT="application/json")

        self.assertEqual(response.status_code, 500)
        payload = response.json()
        self.assertEqual(payload["detail"], "حدث خطأ غير متوقع. حاول مرة أخرى بعد قليل.")
        self.assertIn("request_id", payload)

    def test_web_exception_returns_custom_500_page(self):
        response = self.client.get("/test-boom/")

        self.assertEqual(response.status_code, 500)
        content = response.content.decode("utf-8")
        self.assertIn("حصل خطأ غير متوقع", content)
        self.assertNotIn("Traceback", content)