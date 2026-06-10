"""enhance customers table — add status, tags, notes, location, updated_at

Revision ID: d1e2f3a4b5c6
Revises: c3d9f1a2b4e5
Create Date: 2026-06-10

Changes:
  1. is_active  — BOOLEAN DEFAULT TRUE NOT NULL
  2. tags       — VARCHAR(500) nullable (comma-separated)
  3. notes      — TEXT nullable (admin internal notes)
  4. city / state / country — VARCHAR(100) nullable (denormalised from orders)
  5. updated_at — TIMESTAMPTZ nullable (on-update)
  6. password_hash made nullable (admin-created customers have no self-login)
  7. GIN trigram index on customers.email, first_name, last_name for fast search

SAFETY: All new columns are nullable or have defaults → zero downtime migration.
"""

from alembic import op
import sqlalchemy as sa


revision = "d1e2f3a4b5c6"
down_revision = "c3d9f1a2b4e5"
branch_labels = None
depends_on = None


def upgrade() -> None:

    # ── 1. New columns on customers ──────────────────────────────────────────
    op.add_column("customers", sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")))
    op.add_column("customers", sa.Column("tags",    sa.String(500), nullable=True))
    op.add_column("customers", sa.Column("notes",   sa.Text(),      nullable=True))
    op.add_column("customers", sa.Column("city",    sa.String(100), nullable=True))
    op.add_column("customers", sa.Column("state",   sa.String(100), nullable=True))
    op.add_column("customers", sa.Column("country", sa.String(100), nullable=True))
    op.add_column("customers", sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True))

    # ── 2. Make password_hash nullable (admin-created customers) ─────────────
    op.alter_column("customers", "password_hash", nullable=True)

    # ── 3. Trigram search indexes on customers ───────────────────────────────
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_customers_email_trgm
        ON customers USING GIN (email gin_trgm_ops);
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_customers_first_name_trgm
        ON customers USING GIN (first_name gin_trgm_ops);
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_customers_last_name_trgm
        ON customers USING GIN (last_name gin_trgm_ops);
    """)

    # ── 4. B-tree index on is_active for status filter ───────────────────────
    op.create_index("ix_customers_is_active", "customers", ["is_active"])


def downgrade() -> None:
    op.drop_index("ix_customers_is_active", table_name="customers")
    op.execute("DROP INDEX IF EXISTS ix_customers_last_name_trgm;")
    op.execute("DROP INDEX IF EXISTS ix_customers_first_name_trgm;")
    op.execute("DROP INDEX IF EXISTS ix_customers_email_trgm;")

    op.alter_column("customers", "password_hash", nullable=False)
    op.drop_column("customers", "updated_at")
    op.drop_column("customers", "country")
    op.drop_column("customers", "state")
    op.drop_column("customers", "city")
    op.drop_column("customers", "notes")
    op.drop_column("customers", "tags")
    op.drop_column("customers", "is_active")
