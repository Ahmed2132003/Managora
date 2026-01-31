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
- **Commission**: only added when an approved commission request exists (see Commission System)

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

### Salary Types (MVP)
Each employee must have **one** salary type:
- **Daily**: daily_rate is the fixed daily value.
- **Monthly**: daily_rate = monthly_salary ÷ 30.
- **Weekly / Part-time**: daily_rate = weekly_salary ÷ 7.
- **Commission**: no automatic daily_rate (used only when approved commission requests exist).

These values feed:
- Unpaid leave deductions
- Late/absence deductions
- “Earned to date” calculations

## 3) Data Sources (link to Phase 4 + 5)

### AttendanceRecord
Provides:
- `total_late_minutes`
- `absences` (based on status or missing check-in)

### LeaveRequest
Provides:
- `paid_leave_days`
- `unpaid_leave_days`

Leave request creation:
- Any user role can submit a leave request: **Employee, Manager, Accountant, HR**.
- Entry points: **Leave Balance**, **Leave Requests**, **My Leave Requests**, **Leave Inbox**.

Leave request types:
- **Paid Leave**: deducts from paid leave balance; **no salary deduction**.
- **Unpaid Leave**: **salary deduction** applies via daily_rate; must be visible on payroll lines.

Leave approval matrix:
| Requester | Approver(s) |
| --- | --- |
| Employee | Manager / HR |
| Accountant | Manager / HR |
| HR | Manager only |
| Manager | Higher manager or auto-approve (policy-defined) |

Rules:
- HR **cannot** approve HR requests.
- Manager has the highest approval authority.

### HRAction (Policy Rule Engine — Phase 5)
Provides:
- explicit deduction items (e.g., “deduct X amount”)

**MVP scope:** Start with **absence + late** from attendance and **unpaid leave**. Add HRAction-derived deductions next.

### Commission System (MVP)
- Eligible roles: **Employee**, **Accountant**.
- Flow:
  1. Employee/Accountant completes work.
  2. Submits a **commission request** with the requested amount.
  3. Request is routed to **Manager or HR**.
  4. On approval, the amount is included as **earnings** in payroll.
  5. On rejection, no payroll impact.

Approval matrix:
| Requester | Approver(s) |
| --- | --- |
| Employee | Manager / HR |
| Accountant | Manager / HR |
| HR | Manager only |

Rules:
- HR **cannot** approve their own commission requests.
- Manager can approve for all.

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