from django.core.exceptions import ValidationError
from django.db import transaction

from accounting.models import AccountMapping, Invoice, JournalEntry
from accounting.services.journal import post_journal_entry


def _get_mapping_account(company, key):
    mapping = AccountMapping.objects.filter(company=company, key=key).select_related(
        "account"
    ).first()
    if not mapping or not mapping.account_id:
        raise ValidationError(f"Missing account mapping for {key}.")
    return mapping.account


def ensure_invoice_journal_entry(invoice: Invoice):
    existing_entry = JournalEntry.objects.filter(
        company=invoice.company,
        reference_type=JournalEntry.ReferenceType.INVOICE,
        reference_id=str(invoice.id),
    ).first()
    if existing_entry:
        return existing_entry

    receivable_account = _get_mapping_account(
        invoice.company, AccountMapping.Key.ACCOUNTS_RECEIVABLE
    )
    revenue_account = _get_mapping_account(
        invoice.company, AccountMapping.Key.SALES_REVENUE
    )

    payload = {
        "date": invoice.issue_date,
        "memo": invoice.notes or f"Invoice {invoice.invoice_number}",
        "reference_type": JournalEntry.ReferenceType.INVOICE,
        "reference_id": str(invoice.id),
        "status": JournalEntry.Status.POSTED,
        "lines": [
            {
                "account_id": receivable_account.id,
                "description": f"Invoice {invoice.invoice_number}",
                "debit": invoice.total_amount,
                "credit": 0,
            },
            {
                "account_id": revenue_account.id,
                "description": f"Invoice {invoice.invoice_number}",
                "debit": 0,
                "credit": invoice.total_amount,
            },
        ],
    }

    with transaction.atomic():
        return post_journal_entry(
            company=invoice.company,
            payload=payload,
            created_by=invoice.created_by,
        )