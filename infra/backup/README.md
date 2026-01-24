# Backups (Database)

Use the `db_backup.sh` script to take daily PostgreSQL backups. The script is safe for
both SaaS (pipeline/cron) and on-prem installations.

## Usage

```bash
export POSTGRES_HOST=db
export POSTGRES_PORT=5432
export POSTGRES_DB=app
export POSTGRES_USER=app
export POSTGRES_PASSWORD=app
export BACKUP_DIR=/var/backups/managora
export RETENTION_DAYS=7

./db_backup.sh
```

## Retention policy

The script keeps `RETENTION_DAYS` worth of backups and deletes anything older on each
run. Adjust the value as needed for your compliance requirements.

## Scheduling

**SaaS**: run in your production pipeline or scheduled job (ex: Kubernetes CronJob).

**On-prem**: register a system cron entry, for example:

```bash
0 2 * * * /opt/managora/infra/backup/db_backup.sh >> /var/log/managora/backup.log 2>&1
```