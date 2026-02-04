from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from hr.models import HRAction
from hr.services.actions import (
    remove_hr_action_deduction_component,
    sync_hr_action_deduction_component,
)


@receiver(post_save, sender=HRAction)
def sync_hr_action_deduction_on_save(
    sender, instance: HRAction, **kwargs
) -> None:
    sync_hr_action_deduction_component(instance)


@receiver(post_delete, sender=HRAction)
def sync_hr_action_deduction_on_delete(
    sender, instance: HRAction, **kwargs
) -> None:
    remove_hr_action_deduction_component(instance)