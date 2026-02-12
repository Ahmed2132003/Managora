import json
from datetime import datetime
from pathlib import Path

from django.apps import apps
from django.conf import settings
from django.core import serializers
from django.db import transaction

from core.models import Company, CompanyBackup, RolePermission, User, UserRole


def _company_models():
    models_with_company = []
    for model in apps.get_models():
        if model is CompanyBackup:
            continue
        if any(field.name == "company" for field in model._meta.fields):
            models_with_company.append(model)
    return models_with_company


def _model_order_for_restore(label: str) -> tuple[int, str]:
    order = {
        "core.company": 0,
        "core.permission": 1,
        "core.role": 2,
        "core.user": 3,
        "core.rolepermission": 4,
        "core.userrole": 5,
    }
    return (order.get(label, 50), label)


def _serialize_company_records(company: Company) -> tuple[list[dict], int]:
    payload: list[dict] = []
    total = 0

    # Core base objects for tenant
    payload.extend(json.loads(serializers.serialize("json", [company])))

    permissions = serializers.serialize("json", apps.get_model("core", "Permission").objects.all())
    payload.extend(json.loads(permissions))

    for model in sorted(_company_models(), key=lambda m: m._meta.label_lower):
        label = model._meta.label_lower
        if label in {"core.company", "core.permission"}:
            continue

        qs = model.objects.filter(company_id=company.id)
        rows = json.loads(serializers.serialize("json", qs))
        payload.extend(rows)
        total += len(rows)

    # Through models that do not include company directly
    role_permissions = RolePermission.objects.filter(role__company_id=company.id)
    user_roles = UserRole.objects.filter(user__company_id=company.id)
    rp_rows = json.loads(serializers.serialize("json", role_permissions))
    ur_rows = json.loads(serializers.serialize("json", user_roles))
    payload.extend(rp_rows)
    payload.extend(ur_rows)
    total += len(rp_rows) + len(ur_rows)

    payload.sort(key=lambda row: _model_order_for_restore(row["model"]))
    return payload, total


def create_company_backup(*, company: Company, actor: User | None = None, backup_type: str = CompanyBackup.BackupType.MANUAL) -> CompanyBackup:
    data, total_rows = _serialize_company_records(company)
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")

    root = Path(settings.MEDIA_ROOT) / "backups" / f"company_{company.id}"
    root.mkdir(parents=True, exist_ok=True)
    filename = f"backup_{timestamp}.json"
    path = root / filename

    with path.open("w", encoding="utf-8") as f:
        json.dump(
            {
                "company_id": company.id,
                "company_slug": company.slug,
                "created_at": datetime.utcnow().isoformat(),
                "rows": total_rows,
                "data": data,
            },
            f,
            ensure_ascii=False,
        )

    backup = CompanyBackup.objects.create(
        company=company,
        created_by=actor,
        backup_type=backup_type,
        file_path=str(path),
        row_count=total_rows,
        status=CompanyBackup.Status.READY,
    )
    return backup


def _clear_company_data(company: Company) -> None:
    for model in sorted(_company_models(), key=lambda m: m._meta.label_lower, reverse=True):
        label = model._meta.label_lower
        if label == "core.company":
            continue
        model.objects.filter(company_id=company.id).delete()

    RolePermission.objects.filter(role__company_id=company.id).delete()
    UserRole.objects.filter(user__company_id=company.id).delete()


def restore_company_backup(*, backup: CompanyBackup) -> None:
    with open(backup.file_path, "r", encoding="utf-8") as f:
        payload = json.load(f)

    rows = payload.get("data", [])

    with transaction.atomic():
        _clear_company_data(backup.company)
        for row in rows:
            for obj in serializers.deserialize("json", json.dumps([row]), ignorenonexistent=True):
                obj.save()

    backup.status = CompanyBackup.Status.RESTORED
    backup.save(update_fields=["status"])