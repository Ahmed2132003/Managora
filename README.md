# Company OS

One platform for HR + Attendance + Payroll + Accounting + Dashboards (10–300 employees).

## Repo Structure
- `backend/` Django + DRF API
- `frontend/` React + TypeScript + Vite
- `infra/` Docker, deployment, and environment setup
- `docs/` Architecture notes and decisions

## Development Setup (Phase 1)
> Phase 1 focuses on project foundation + multi-tenant skeleton + auth.

### Requirements
- Git
- Docker + Docker Compose
- Node.js (later)
- Python (later)

## Branching
- `main`: stable releases
- `develop`: integration branch
- `feature/*`: feature branches per phase

## Decisions (Fixed)
- Multi-tenant: `Company` + `user.company_id`
- Auth: SimpleJWT
- API Docs: drf-spectacular
- Front: React TS + Vite + Router + TanStack Query
- Token storage (MVP): localStorage + refresh
