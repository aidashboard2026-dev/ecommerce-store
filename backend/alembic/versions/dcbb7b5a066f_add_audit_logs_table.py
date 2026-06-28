"""add audit_logs table

Revision ID: dcbb7b5a066f
Revises: c9a651a0fe25
Create Date: 2026-06-27

PURPOSE
-------
Creates the audit_logs table that records every admin write action across
all modules (products, orders, offers, banners, custom products, settings).

IDEMPOTENCY
-----------
This revision was previously generated via autogenerate, compiled by Alembic
(pycache exists), then deleted before being merged into the chain.
It may or may not have been applied to the production database.

Every statement in upgrade() uses IF NOT EXISTS / exception-safe DDL so this
migration is safe to run against a database that already has the table AND
against a database that does not.

DESIGN
------
- audit_status_enum PostgreSQL ENUM type: ('success', 'failure')
- admin_id is a soft FK (no FK constraint) — audit records survive
  admin account deletion.
- changes is JSONB — flexible per-action payload.
- Composite indexes on (resource_type, resource_id) and (admin_id, created_at)
  cover the two most common admin audit queries.
- All scalar columns except action, resource_type, status, created_at are
  nullable — bulk actions have no single resource_id.
"""

from alembic import op


revision = "dcbb7b5a066f"
down_revision = "c9a651a0fe25"
branch_labels = None
depends_on = None


def upgrade() -> None:

    # ── 1. ENUM type ──────────────────────────────────────────────────────────
    # DO-block catches duplicate_object so re-running is safe.
    op.execute("""
        DO $$
        BEGIN
            CREATE TYPE audit_status_enum AS ENUM ('success', 'failure');
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END
        $$;
    """)

    # ── 2. Table ──────────────────────────────────────────────────────────────
    op.execute("""
        CREATE TABLE IF NOT EXISTS audit_logs (
            id             SERIAL          PRIMARY KEY,

            -- Who performed the action (soft FK — survives account deletion)
            admin_id       INTEGER,
            admin_email    VARCHAR(255),
            admin_name     VARCHAR(100),

            -- What was done
            action         VARCHAR(100)    NOT NULL,
            resource_type  VARCHAR(100)    NOT NULL,
            resource_id    INTEGER,
            resource_label VARCHAR(255),

            -- Change payload (JSONB for flexible per-action structure)
            changes        JSONB,

            -- Request context
            ip_address     VARCHAR(45),
            user_agent     VARCHAR(500),

            -- Outcome
            status         audit_status_enum NOT NULL DEFAULT 'success',
            error_message  TEXT,

            -- Timestamp — immutable, server-side
            created_at     TIMESTAMPTZ     NOT NULL DEFAULT NOW()
        )
    """)

    # ── 3. Single-column indexes ──────────────────────────────────────────────
    op.execute("CREATE INDEX IF NOT EXISTS ix_audit_logs_admin_id      ON audit_logs (admin_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_audit_logs_action        ON audit_logs (action)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_audit_logs_resource_type ON audit_logs (resource_type)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_audit_logs_resource_id   ON audit_logs (resource_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_audit_logs_status        ON audit_logs (status)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_audit_logs_created_at    ON audit_logs (created_at)")

    # ── 4. Composite indexes ──────────────────────────────────────────────────
    # Covers: "show all changes to resource X"
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_audit_resource
        ON audit_logs (resource_type, resource_id)
    """)

    # Covers: "show all actions by admin Y in time range"
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_audit_admin_created
        ON audit_logs (admin_id, created_at)
    """)


def downgrade() -> None:

    op.execute("DROP INDEX IF EXISTS ix_audit_admin_created")
    op.execute("DROP INDEX IF EXISTS ix_audit_resource")
    op.execute("DROP INDEX IF EXISTS ix_audit_logs_created_at")
    op.execute("DROP INDEX IF EXISTS ix_audit_logs_status")
    op.execute("DROP INDEX IF EXISTS ix_audit_logs_resource_id")
    op.execute("DROP INDEX IF EXISTS ix_audit_logs_resource_type")
    op.execute("DROP INDEX IF EXISTS ix_audit_logs_action")
    op.execute("DROP INDEX IF EXISTS ix_audit_logs_admin_id")

    op.execute("DROP TABLE IF EXISTS audit_logs")

    op.execute("DROP TYPE IF EXISTS audit_status_enum")