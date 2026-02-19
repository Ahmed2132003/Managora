from django.db import transaction

from accounting.models import Account, AccountMapping, Invoice, JournalEntry, JournalLine
from accounting.services.mappings import ensure_mapping_account
from accounting.services.journal import post_journal_entry
from accounting.services.primary_accounts import get_or_create_primary_account


def _invoice_journal_payload(invoice: Invoice, receivable_account_id: int, revenue_account_id: int) -> dict:
    return {
        "date": invoice.issue_date,
        "memo": invoice.notes or f"Invoice {invoice.invoice_number}",
        "reference_type": JournalEntry.ReferenceType.INVOICE,
        "reference_id": str(invoice.id),
        "status": JournalEntry.Status.POSTED,
        "lines": [
            {
                "account_id": receivable_account_id,
                "description": f"Invoice {invoice.invoice_number}",
                "debit": invoice.total_amount,
                "credit": 0,
            },
            {
                "account_id": revenue_account_id,
                "description": f"Invoice {invoice.invoice_number}",
                "debit": 0,
                "credit": invoice.total_amount,
            },
        ],
    }


def _refresh_invoice_journal_lines(entry: JournalEntry, payload: dict, company) -> None:
    lines = payload["lines"]
    JournalLine.objects.filter(entry=entry).delete()
    JournalLine.objects.bulk_create(
        [
            JournalLine(
                company=company,
                entry=entry,
                account_id=line["account_id"],
                description=line.get("description", ""),
                debit=line.get("debit") or 0,
                credit=line.get("credit") or 0,
            )
            for line in lines
        ]
    )


def ensure_invoice_journal_entry(invoice: Invoice):
    receivable_account = ensure_mapping_account(
        invoice.company, AccountMapping.Key.ACCOUNTS_RECEIVABLE
    )
    revenue_account = get_or_create_primary_account(
        invoice.company,
        Account.Type.INCOME,
    )
    payload = _invoice_journal_payload(
        invoice,
        receivable_account_id=receivable_account.id,
        revenue_account_id=revenue_account.id,
    )

    existing_entry = JournalEntry.objects.filter(
        company=invoice.company,
        reference_type=JournalEntry.ReferenceType.INVOICE,
        reference_id=str(invoice.id),        
    ).first()
    if existing_entry:
        existing_entry.date = payload["date"]
        existing_entry.memo = payload["memo"]
        existing_entry.status = payload["status"]
        existing_entry.save(update_fields=["date", "memo", "status", "updated_at"])
        _refresh_invoice_journal_lines(existing_entry, payload, invoice.company)
        return existing_entry

    with transaction.atomic():
        return post_journal_entry(            
            company=invoice.company,
            payload=payload,
            created_by=invoice.created_by,
        )