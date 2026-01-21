# Payroll Engine Spec — Part 1 (Data Model + Calculation Rules)

**Goal:** Define the payroll language for MVP: what items exist, how they’re calculated, and how they link to attendance, leave, loans, and penalties.

## 1) Core Concepts (must be defined before code)

### Payroll Period
A specific month (e.g. `2026-01`) with a status:
- `draft`: calculations can be modified/regenerated
- `locked`: closed period; no changes that affect payroll

### Salary Structure
Fixed employee components:
- Base salary (basic)
- Fixed allowances
- Fixed deductions (if any)

### Variable Deductions
Derived from:
- Late/absence rules (from Phase 5)
- Unpaid leave
- Early leave (optional later)

### Loans / Advances
- **Advance**: salary advance paid out and repaid over installments
- **Loan**: formal loan with repayment schedule

### Payroll Run
Payroll for **one employee** inside **one payroll period** (the payslip/statement).

### Payroll Lines
Detailed items in a payroll run (basic, allowance, deduction, loan installment, etc.).

## 2) Calculation Policy (MVP Rulebook)

### Earnings
- **Basic Salary**: fixed value from Salary Structure
- **Allowances**: sum of fixed allowances

### Deductions
- **Absence deduction**: `absent_days × daily_rate`
- **Late deduction**: `late_minutes × rate_per_minute` (or precomputed from Phase 5 rules)
- **Unpaid leave**: `unpaid_leave_days × daily_rate`
- **Loan installment**: from repayment schedule

### Net Salary
```
net = earnings_total - deductions_total
```

### Daily Rate (MVP)
```
daily_rate = basic_salary / working_days_in_month
```
- `working_days_in_month` is a company-level constant (e.g., **30**) for MVP.
- Later can be derived from calendar settings.

## 3) Data Sources (link to Phase 4 + 5)

### AttendanceRecord
Provides:
- `total_late_minutes`
- `absences` (based on status or missing check-in)

### LeaveRequest
Provides:
- `paid_leave_days`
- `unpaid_leave_days`

### HRAction (Policy Rule Engine — Phase 5)
Provides:
- explicit deduction items (e.g., “deduct X amount”)

**MVP scope:** Start with **absence + late** from attendance and **unpaid leave**. Add HRAction-derived deductions next.

## 4) Data Integrity Rules

- **PayrollPeriod** must be unique per `company + year + month`.
- **PayrollRun** must be unique per `period + employee`.
- If **Period = locked**:
  - Block modifications to Attendance/Leave in the same month (or record as adjustments).
  - Block regeneration unless an explicit “unlock” flow (not in MVP).

---

**Deliverable (Part 1):** This spec answers:
- How payroll is calculated (rulebook)
- Where data comes from (attendance, leave, HR actions)
- What gets locked and when