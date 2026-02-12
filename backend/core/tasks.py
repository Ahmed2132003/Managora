from celery import shared_task

from core.models import Company, CompanyBackup
from core.services.company_backups import create_company_backup


@shared_task
def create_daily_company_backups():
    for company in Company.objects.filter(is_active=True):
        create_company_backup(company=company, actor=None, backup_type=CompanyBackup.BackupType.AUTOMATIC)