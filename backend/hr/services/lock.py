from django.db import transaction
from django.utils import timezone

from hr.models import PayrollPeriod, PayrollRun


def lock_period(period, actor):
    if period.status == PayrollPeriod.Status.LOCKED:
        return period

    with transaction.atomic():
        period.status = PayrollPeriod.Status.LOCKED
        period.locked_at = timezone.now()
        period.save(update_fields=["status", "locked_at", "updated_at"])
        PayrollRun.objects.filter(period=period).update(status=PayrollRun.Status.APPROVED)

    return period