from django.core.management.base import BaseCommand
from django.urls import URLPattern, URLResolver, get_resolver
from rest_framework.permissions import AllowAny


class Command(BaseCommand):
    help = "List API endpoints without explicit permission classes."

    def handle(self, *args, **options):
        resolver = get_resolver()
        missing_permissions = []

        for path, view_cls in self._iter_patterns(resolver.url_patterns):
            if not view_cls:
                continue
            permissions = getattr(view_cls, "permission_classes", None)
            if permissions is None:
                missing_permissions.append((path, view_cls.__name__, "missing"))
                continue
            if len(permissions) == 0:
                missing_permissions.append((path, view_cls.__name__, "empty"))
                continue
            if any(perm is AllowAny for perm in permissions):
                missing_permissions.append((path, view_cls.__name__, "allowany"))

        if not missing_permissions:
            self.stdout.write(self.style.SUCCESS("All endpoints declare permission classes."))
            return

        self.stdout.write(self.style.WARNING("Endpoints without explicit permissions:"))
        for path, view_name, reason in missing_permissions:
            self.stdout.write(f"- {path} ({view_name}) [{reason}]")

    def _iter_patterns(self, patterns, prefix=""):
        for pattern in patterns:
            if isinstance(pattern, URLResolver):
                yield from self._iter_patterns(
                    pattern.url_patterns, prefix=f"{prefix}{pattern.pattern}"
                )
            elif isinstance(pattern, URLPattern):
                callback = pattern.callback
                view_cls = getattr(callback, "cls", None) or getattr(
                    callback, "view_class", None
                )
                yield (f"{prefix}{pattern.pattern}", view_cls)