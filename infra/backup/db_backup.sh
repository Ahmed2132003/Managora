#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/managora}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
POSTGRES_HOST="${POSTGRES_HOST:-db}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_DB="${POSTGRES_DB:-app}"
POSTGRES_USER="${POSTGRES_USER:-app}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-app}"

mkdir -p "${BACKUP_DIR}"

timestamp="$(date +%F_%H-%M-%S)"
backup_file="${BACKUP_DIR}/managora_${timestamp}.dump"

export PGPASSWORD="${POSTGRES_PASSWORD}"
pg_dump \
  --host "${POSTGRES_HOST}" \
  --port "${POSTGRES_PORT}" \
  --username "${POSTGRES_USER}" \
  --format=custom \
  --file "${backup_file}" \
  "${POSTGRES_DB}"

find "${BACKUP_DIR}" -name "managora_*.dump" -type f -mtime "+${RETENTION_DAYS}" -delete

echo "Backup created: ${backup_file}"