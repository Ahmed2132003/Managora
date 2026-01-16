# Phase 1 Checklist

## I) Swagger / API Docs
- ✅ drf-spectacular schema endpoint (`/api/schema/`)
- ✅ Swagger UI endpoint (`/api/docs/`)
- ✅ Login + Me endpoints documented
- ⬜ Swagger used during development

## J) Testing + E2E Verification
### Backend Unit Test (minimum)
- ✅ Test `/api/me/` without token → 401
- ✅ Test `/api/me/` with token → 200 + company returned

### Manual E2E (required)
- ⬜ Run `docker compose`
- ⬜ Run seed command
- ⬜ Open `/login`
- ⬜ Login
- ⬜ Verify dashboard shows user + company
- ⬜ Logout returns to login

> Note: Manual E2E steps must be completed in the target environment.