# Production-ish Deployment

## Compose
- Use `infra/docker-compose.prod.yml` with `.env.prod`.
- Services:
  - Postgres (demo)
  - Redis
  - Backend (Gunicorn)
  - Celery worker + beat (profiles)
  - Frontend build container → static volume
  - Nginx reverse proxy

## Environment & Secrets
- Copy `infra/.env.prod.example` → `infra/.env.prod`.
- Never commit `.env.prod`.
- Rotate `DJANGO_SECRET_KEY` for every production release.

## Migrations & Static
Backend entrypoint performs:
1. `python manage.py migrate --noinput`
2. `python manage.py collectstatic --noinput`
3. `gunicorn config.wsgi:application`

## Run
```bash
cd infra
cp .env.prod.example .env.prod
docker compose -f docker-compose.prod.yml up -d --build
```

## Optional Celery
```bash
docker compose -f docker-compose.prod.yml --profile worker up -d
```