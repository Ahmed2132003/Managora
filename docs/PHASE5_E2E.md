# Phase 5 E2E Manual Checklist (Frontend)

## Leaves end-to-end
1. HR creates a new LeaveType and grants leave balances to an employee.
2. Employee opens `/leaves/balance` and confirms the balance cards and details list.
3. Employee submits a new request from `/leaves/request`.
4. Manager/HR opens `/hr/leaves/inbox`, reviews the pending request, and approves it.
5. Employee opens `/leaves/my` and confirms the request status is **Approved**.
6. Employee re-checks `/leaves/balance` and confirms remaining balance decreased.

## Attendance policy automation
1. HR opens `/hr/policies` and adds a template rule (Late/Absent) with action.
2. Employee creates a late or absent attendance record.
3. HR opens `/hr/actions` and confirms the new HRAction appears.

## Success criteria
* Leave types, balances, requests, and approvals work end-to-end.
* Policy rules generate HRAction automatically from attendance.
* Employee and HR/Manager UIs are complete for phase 5.