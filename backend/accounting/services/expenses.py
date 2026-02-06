from django.core.exceptions import ValidationError
from django.db import transaction

from accounting.models import Expense, JournalEntry, JournalLine
from accounting.services.journal import post_journal_entry


def _expense_journal_payload(expense: Expense) -> dict:
    return {
        "date": expense.date,
        "memo": expense.notes or f"Expense {expense.id}",
        "reference_type": JournalEntry.ReferenceType.EXPENSE,
        "reference_id": str(expense.id),
        "status": (
            JournalEntry.Status.POSTED
            if expense.status == Expense.Status.APPROVED
            else JournalEntry.Status.DRAFT
        ),
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


def _validate_expense(expense: Expense) -> None:
    if expense.amount <= 0:
        raise ValidationError("Expense amount must be greater than zero.")
    if expense.expense_account.company_id != expense.company_id:
        raise ValidationError("Expense account must belong to the same company.")
    if expense.paid_from_account.company_id != expense.company_id:
        raise ValidationError("Paid-from account must belong to the same company.")
    if expense.cost_center and expense.cost_center.company_id != expense.company_id:
        raise ValidationError("Cost center must belong to the same company.")


def _refresh_expense_journal_lines(entry: JournalEntry, expense: Expense) -> None:
    description = expense.vendor_name or "Expense"
    payment_description = expense.vendor_name or "Expense payment"
    entry.lines.all().delete()
    JournalLine.objects.bulk_create(
        [
            JournalLine(
                company=expense.company,
                entry=entry,
                account=expense.expense_account,
                cost_center=expense.cost_center,
                description=description,
                debit=expense.amount,
                credit=0,
            ),
            JournalLine(
                company=expense.company,
                entry=entry,
                account=expense.paid_from_account,
                cost_center=None,
                description=payment_description,
                debit=0,
                credit=expense.amount,
            ),
        ]
    )


def ensure_expense_journal_entry(expense: Expense):
    existing_entry = JournalEntry.objects.filter(
        company=expense.company,
        reference_type=JournalEntry.ReferenceType.EXPENSE,
        reference_id=str(expense.id),
    ).first()
    _validate_expense(expense)

    payload = _expense_journal_payload(expense)
    if existing_entry:
        with transaction.atomic():
            existing_entry.date = payload["date"]
            existing_entry.memo = payload["memo"]
            existing_entry.status = payload["status"]
            existing_entry.save(update_fields=["date", "memo", "status", "updated_at"])
            _refresh_expense_journal_lines(existing_entry, expense)
        return existing_entry

    with transaction.atomic():
        return post_journal_entry(
            company=expense.company,
            payload=payload,
            created_by=expense.created_by,
        )