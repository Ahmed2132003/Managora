from calendar import monthrange
from datetime import date
from decimal import Decimal

from django.db import transaction
from django.db.models import Sum
from django.db.models import Q
from rest_framework.exceptions import ValidationError

from accounting.models import Account, AccountMapping, JournalEntry, JournalLine
from hr.models import PayrollRun


def _period_end_date(period):
    last_day = monthrange(period.year, period.month)[1]
    return date(period.year, period.month, last_day)


def _auto_map_payroll_accounts(company, required_keys):
    if AccountMapping.Key.PAYROLL_SALARIES_EXPENSE in required_keys:
        salaries_account = (
            Account.objects.filter(company=company, code__in=["5000", "5200"])
            .order_by("code")
            .first()
        )
        if not salaries_account:
            salaries_account = (
                Account.objects.filter(
                    company=company,
                    type=Account.Type.EXPENSE,
                )
                .filter(
                    Q(name__icontains="salaries")
                    | Q(name__icontains="salary")
                    | Q(name__icontains="payroll")
                )
                .order_by("code")
                .first()
            )
        if not salaries_account:
            salaries_account = Account.objects.create(
                company=company,
                code="5000",
                name="Payroll Salaries Expense",
                type=Account.Type.EXPENSE,
            )
        if salaries_account:
            AccountMapping.objects.update_or_create(
                company=company,
                key=AccountMapping.Key.PAYROLL_SALARIES_EXPENSE,
                defaults={"account": salaries_account, "required": True},                
            )

    if AccountMapping.Key.PAYROLL_PAYABLE in required_keys:
        payable_account = (
            Account.objects.filter(company=company, code__in=["2100"])
            .order_by("code")
            .first()
        )
        if not payable_account:
            payable_account = (
                Account.objects.filter(
                    company=company,
                    type=Account.Type.LIABILITY,
                )
                .filter(
                    Q(name__icontains="payroll payable")
                    | (Q(name__icontains="payroll") & Q(name__icontains="payable"))
                )
                .order_by("code")
                .first()
            )
        if not payable_account:
            payable_account = Account.objects.create(
                company=company,
                code="2100",
                name="Payroll Payable",
                type=Account.Type.LIABILITY,
            )
        if payable_account:
            AccountMapping.objects.update_or_create(
                company=company,
                key=AccountMapping.Key.PAYROLL_PAYABLE,                
                defaults={"account": payable_account, "required": True},
            )


def generate_payroll_journal(period, actor=None):
    company = period.company
    existing = JournalEntry.objects.filter(
        company=company,        
        reference_type=JournalEntry.ReferenceType.PAYROLL_PERIOD,
        reference_id=str(period.id),
    ).first()
    if existing:
        return existing

    required_keys = {
        AccountMapping.Key.PAYROLL_SALARIES_EXPENSE,
        AccountMapping.Key.PAYROLL_PAYABLE,
    }
    mappings = {
        mapping.key: mapping
        for mapping in AccountMapping.objects.filter(
            company=company, key__in=required_keys
        ).select_related("account")
    }
    missing = [
        key for key in required_keys if key not in mappings or not mappings[key].account_id
    ]
    if missing:
        _auto_map_payroll_accounts(company, required_keys)
        mappings = {
            mapping.key: mapping
            for mapping in AccountMapping.objects.filter(
                company=company, key__in=required_keys
            ).select_related("account")
        }
        missing = [
            key
            for key in required_keys
            if key not in mappings or not mappings[key].account_id
        ]
        if missing:
            raise ValidationError(
                {"detail": f"Missing account mapping for: {', '.join(sorted(missing))}."}
            )
            
    totals = PayrollRun.objects.filter(period=period).aggregate(
        gross_total=Sum("earnings_total"),
        net_total=Sum("net_total"),
    )
    gross_total = totals["gross_total"] or Decimal("0")
    net_total = totals["net_total"] or Decimal("0")

    if gross_total <= 0 or net_total <= 0:
        raise ValidationError({"detail": "Payroll totals must be greater than zero."})

    salaries_account = mappings[AccountMapping.Key.PAYROLL_SALARIES_EXPENSE].account
    payable_account = mappings[AccountMapping.Key.PAYROLL_PAYABLE].account

    with transaction.atomic():
        entry = JournalEntry.objects.create(
            company=company,
            date=_period_end_date(period),
            reference_type=JournalEntry.ReferenceType.PAYROLL_PERIOD,
            reference_id=str(period.id),
            memo=f"Payroll period {period.year}/{period.month:02d}",
            status=JournalEntry.Status.POSTED,
            created_by=actor,
        )
        JournalLine.objects.bulk_create(
            [
                JournalLine(
                    company=company,
                    entry=entry,
                    account=salaries_account,
                    description="Payroll salaries expense",
                    debit=gross_total,
                    credit=Decimal("0"),
                ),
                JournalLine(
                    company=company,
                    entry=entry,
                    account=payable_account,
                    description="Payroll payable",
                    debit=Decimal("0"),
                    credit=net_total,
                ),
            ]
        )

    return entry