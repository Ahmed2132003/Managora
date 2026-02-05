from decimal import Decimal

from django.db import transaction
from django.db.models import Sum
from django.db.models.functions import Coalesce

from accounting.models import AccountMapping, Invoice, JournalEntry, Payment
from accounting.services.mappings import ensure_mapping_account
from accounting.services.journal import post_journal_entry


def _update_invoice_status(invoice: Invoice):
    total_paid = (
        Payment.objects.filter(invoice=invoice)
        .aggregate(total=Coalesce(Sum("amount"), Decimal("0")))        
        .get("total")
        or Decimal("0")
    )
    if total_paid >= invoice.total_amount:
        invoice.status = Invoice.Status.PAID
    elif total_paid > 0:
        invoice.status = Invoice.Status.PARTIALLY_PAID
    else:
        return
    invoice.save(update_fields=["status"])


def record_payment(payment: Payment):
    receivable_account = ensure_mapping_account(        
        payment.company, AccountMapping.Key.ACCOUNTS_RECEIVABLE
    )
    memo = payment.notes or f"Payment {payment.id}"
    payload = {
        "date": payment.payment_date,
        "memo": memo,
        "reference_type": JournalEntry.ReferenceType.PAYMENT,
        "reference_id": str(payment.id),
        "status": JournalEntry.Status.POSTED,
        "lines": [
            {
                "account_id": payment.cash_account_id,
                "description": memo,
                "debit": payment.amount,
                "credit": 0,
            },
            {
                "account_id": receivable_account.id,
                "description": memo,
                "debit": 0,
                "credit": payment.amount,
            },
        ],
    }

    with transaction.atomic():
        entry = post_journal_entry(
            company=payment.company,
            payload=payload,
            created_by=payment.created_by,
        )
        if payment.invoice_id:
            _update_invoice_status(payment.invoice)
    return entry