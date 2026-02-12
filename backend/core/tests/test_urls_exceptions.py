from django.http import HttpResponse
from django.urls import path


def boom_view(_request):
    raise RuntimeError("Boom")


def web_ok(_request):
    return HttpResponse("ok")


urlpatterns = [
    path("api/test-boom/", boom_view),
    path("test-boom/", boom_view),
    path("test-ok/", web_ok),
]