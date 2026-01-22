from django.db import transaction

from accounting.models import Expense, JournalEntry
from accounting.services.journal import post_journal_entry


def ensure_expense_journal_entry(expense: Expense):
    existing_entry = JournalEntry.objects.filter(
        company=expense.company,
        reference_type=JournalEntry.ReferenceType.EXPENSE,
        reference_id=str(expense.id),
    ).first()
    if existing_entry:
        return existing_entry

    payload = {
        "date": expense.date,
        "memo": expense.notes or f"Expense {expense.id}",
        "reference_type": JournalEntry.ReferenceType.EXPENSE,
        "reference_id": str(expense.id),
        "status": JournalEntry.Status.POSTED,
        "lines": [
            {
                "account_id": expense.expense_account_id,
                "cost_center_id": expense.cost_center_id,
                "description": expense.vendor_name or "Expense",
                "debit": expense.amount,
                "credit": 0,
            },
            {
                "account_id": expense.paid_from_account_id,
                "description": expense.vendor_name or "Expense payment",
                "debit": 0,
                "credit": expense.amount,
            },
        ],
    }

    with transaction.atomic():
        return post_journal_entry(
            company=expense.company,
            payload=payload,
            created_by=expense.created_by,
        )