# Beta Acceptance Checklist

## Setup & Template
- [ ] Company setup template creates a complete starter company.

## RBAC & Permissions
- [ ] HR and Accountant roles are consistent across views and APIs.
- [ ] Copilot intents respect permissions and data access.

## Observability & Security
- [ ] Audit logs record sensitive actions.
- [ ] Health checks return OK (`/api/health/`).
- [ ] Secrets are stored outside Git (`.env.prod` only).

## Backups
- [ ] Backup script is present and documented (`infra/backup/db_backup.sh`).

## Performance & UX
- [ ] Pagination is enabled on list endpoints.
- [ ] No N+1 queries in list views (verify with debug tooling).
- [ ] UI states are polished (loading/empty/error).

## Beta E2E Scenario (Manual)
1. Create company/admin.
2. Apply template.
3. Add employee.
4. Attendance check-in/out.
5. Generate payroll (if enabled).
6. Create expense → journal entry.
7. Copilot report.
8. Export report.