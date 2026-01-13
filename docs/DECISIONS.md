# Project Decisions (Phase 1)

## Core Stack
- Backend: Django + DRF + PostgreSQL + Redis
- Auth: JWT (SimpleJWT)
- API Docs: drf-spectacular
- Frontend: React + TypeScript + Vite + React Router + TanStack Query

## Multi-tenancy
- Single database
- Each record is tied to `company_id`
- No schema-per-tenant, no subdomains (for MVP)

## Token Storage (MVP)
- localStorage for access/refresh tokens
- Refresh strategy: basic (improve later)
