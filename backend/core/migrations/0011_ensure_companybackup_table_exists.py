from django.conf import settings
from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0010_companybackup"),
    ]

    operations = [
        migrations.RunSQL(
            sql=f"""
            CREATE TABLE IF NOT EXISTS core_companybackup (
                id BIGSERIAL PRIMARY KEY,
                backup_type VARCHAR(20) NOT NULL DEFAULT 'manual',
                status VARCHAR(20) NOT NULL DEFAULT 'ready',
                file_path TEXT NOT NULL,
                row_count INTEGER NOT NULL DEFAULT 0,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                company_id BIGINT NOT NULL REFERENCES core_company(id) DEFERRABLE INITIALLY DEFERRED,
                created_by_id BIGINT NULL REFERENCES {settings.AUTH_USER_MODEL.replace('.', '_').lower()}(id) DEFERRABLE INITIALLY DEFERRED,
                CONSTRAINT core_companybackup_backup_type_check CHECK (backup_type IN ('manual', 'automatic')),
                CONSTRAINT core_companybackup_status_check CHECK (status IN ('ready', 'failed', 'restored')),
                CONSTRAINT core_companybackup_row_count_check CHECK (row_count >= 0)
            );
            """,
            reverse_sql="DROP TABLE IF EXISTS core_companybackup CASCADE;",
        ),
        migrations.RunSQL(
            sql="""
            CREATE INDEX IF NOT EXISTS core_backup_cmp_created_idx
            ON core_companybackup (company_id, created_at);
            """,
            reverse_sql="DROP INDEX IF EXISTS core_backup_cmp_created_idx;",
        ),
    ]