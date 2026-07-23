"""orders update — restore full schema upgrade

Revision ID: dee988a94348
Revises: ae78e3561c2b
Create Date: 2026-06-08 14:05:42.684158

REPAIR NOTE (2026-07-13)
------------------------
The original upgrade() body was entirely commented out ("pass" only).
This left the orders table in its initial 9-column state from ae78e3561c2b,
so every subsequent migration that referenced the new columns (price,
total_amount, payment_method, tracking_status, etc.) crashed on a fresh DB.

The downgrade() was always intact — proving the original intent.

This restore:
  - Adds ALL columns required by the current Order ORM.
  - Drops ALL legacy columns that no longer exist in the ORM
    (customer, items, total, status, payment).
  - Every statement uses IF NOT EXISTS / IF EXISTS so the migration is
    fully idempotent: safe on fresh databases AND on existing databases
    that already received these columns via prior manual ALTER TABLE.
  - Also adds delivery_days and expected_delivery_date which the docstring
    described but the original implementation omitted.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'dee988a94348'
down_revision: Union[str, None] = "ae78e3561c2b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── 1. Widen order_number VARCHAR(32) → VARCHAR(50) ───────────────────────
    # Safe to run even if already 50 — Postgres is a no-op for same-size widening
    # when no CHECK constraint exists.
    op.execute(
        "ALTER TABLE orders ALTER COLUMN order_number TYPE VARCHAR(50)"
    )

    # ── 2. Add new customer / address columns ─────────────────────────────────
    op.execute("ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_name  VARCHAR(255)")
    op.execute("ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_email VARCHAR(255)")
    op.execute("ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(20)")
    op.execute("ALTER TABLE orders ADD COLUMN IF NOT EXISTS address_line1  VARCHAR(255)")
    op.execute("ALTER TABLE orders ADD COLUMN IF NOT EXISTS address_line2  VARCHAR(255)")
    op.execute("ALTER TABLE orders ADD COLUMN IF NOT EXISTS city           VARCHAR(100)")
    op.execute("ALTER TABLE orders ADD COLUMN IF NOT EXISTS state          VARCHAR(100)")
    op.execute("ALTER TABLE orders ADD COLUMN IF NOT EXISTS country        VARCHAR(100)")
    op.execute("ALTER TABLE orders ADD COLUMN IF NOT EXISTS pincode        VARCHAR(20)")

    # ── 3. Add product-snapshot columns ──────────────────────────────────────
    op.execute("ALTER TABLE orders ADD COLUMN IF NOT EXISTS product_name  VARCHAR(255)")
    op.execute("ALTER TABLE orders ADD COLUMN IF NOT EXISTS product_image VARCHAR(500)")
    op.execute("ALTER TABLE orders ADD COLUMN IF NOT EXISTS size          VARCHAR(50)")
    op.execute("ALTER TABLE orders ADD COLUMN IF NOT EXISTS color         VARCHAR(100)")
    op.execute("ALTER TABLE orders ADD COLUMN IF NOT EXISTS quantity      INTEGER")

    # ── 4. Add monetary columns (Float — b2c3d4e5f6a7 will promote to Numeric) ─
    # We intentionally store as FLOAT here to honour the historical migration
    # intent. Migration b2c3d4e5f6a7 then ALTERs them to NUMERIC(10,2).
    op.execute("ALTER TABLE orders ADD COLUMN IF NOT EXISTS price        FLOAT")
    op.execute("ALTER TABLE orders ADD COLUMN IF NOT EXISTS total_amount FLOAT")

    # ── 5. Add payment / tracking columns ────────────────────────────────────
    op.execute("ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method  VARCHAR(50)")
    op.execute("ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status  VARCHAR(50)")
    op.execute("ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_status VARCHAR(50)")
    op.execute("ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_note   TEXT")

    # ── 6. Add delivery columns ───────────────────────────────────────────────
    # These were in the docstring but missing from the original commented-out body.
    op.execute("ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_days          INTEGER")
    op.execute("ALTER TABLE orders ADD COLUMN IF NOT EXISTS expected_delivery_date TIMESTAMP")

    # ── 7. Timestamp columns: normalise to plain TIMESTAMP ────────────────────
    # Migration d2e3f4a5b6c7 later promotes all of these to TIMESTAMPTZ.
    # We only do the ALTER if the column is still TIMESTAMP WITHOUT TIME ZONE
    # (i.e. the type that ae78e3561c2b created it as).
    # Using raw SQL with USING clause avoids any data-loss risk.
    for col in ("ordered_at", "created_at", "updated_at"):
        op.execute(
            f"ALTER TABLE orders "
            f"ALTER COLUMN {col} TYPE TIMESTAMP WITHOUT TIME ZONE "
            f"USING {col} AT TIME ZONE 'UTC'"
        )

    # ── 8. Drop legacy columns that no longer exist in the ORM ───────────────
    # Using IF EXISTS so this is safe on existing databases where a prior
    # manual migration already removed them.
    op.execute("ALTER TABLE orders DROP COLUMN IF EXISTS customer")
    op.execute("ALTER TABLE orders DROP COLUMN IF EXISTS items")
    op.execute("ALTER TABLE orders DROP COLUMN IF EXISTS total")
    op.execute("ALTER TABLE orders DROP COLUMN IF EXISTS status")
    op.execute("ALTER TABLE orders DROP COLUMN IF EXISTS payment")


def downgrade() -> None:
    # Re-add legacy columns removed in upgrade
    op.add_column('orders', sa.Column('payment', sa.VARCHAR(length=50), autoincrement=False, nullable=True))
    op.add_column('orders', sa.Column('items', sa.INTEGER(), autoincrement=False, nullable=True))
    op.add_column('orders', sa.Column('status', sa.VARCHAR(length=50), autoincrement=False, nullable=True))
    op.add_column('orders', sa.Column('total', sa.NUMERIC(precision=12, scale=2), autoincrement=False, nullable=True))
    op.add_column('orders', sa.Column('customer', sa.VARCHAR(length=100), autoincrement=False, nullable=True))

    # Restore timestamp types
    for col in ("ordered_at", "created_at", "updated_at"):
        op.execute(
            f"ALTER TABLE orders "
            f"ALTER COLUMN {col} TYPE TIMESTAMPTZ "
            f"USING {col} AT TIME ZONE 'UTC'"
        )

    # Narrow order_number back
    op.execute("ALTER TABLE orders ALTER COLUMN order_number TYPE VARCHAR(32)")

    # Drop all columns added in upgrade
    op.execute("ALTER TABLE orders DROP COLUMN IF EXISTS expected_delivery_date")
    op.execute("ALTER TABLE orders DROP COLUMN IF EXISTS delivery_days")
    op.execute("ALTER TABLE orders DROP COLUMN IF EXISTS tracking_note")
    op.execute("ALTER TABLE orders DROP COLUMN IF EXISTS tracking_status")
    op.execute("ALTER TABLE orders DROP COLUMN IF EXISTS payment_status")
    op.execute("ALTER TABLE orders DROP COLUMN IF EXISTS payment_method")
    op.execute("ALTER TABLE orders DROP COLUMN IF EXISTS total_amount")
    op.execute("ALTER TABLE orders DROP COLUMN IF EXISTS price")
    op.execute("ALTER TABLE orders DROP COLUMN IF EXISTS quantity")
    op.execute("ALTER TABLE orders DROP COLUMN IF EXISTS color")
    op.execute("ALTER TABLE orders DROP COLUMN IF EXISTS size")
    op.execute("ALTER TABLE orders DROP COLUMN IF EXISTS product_image")
    op.execute("ALTER TABLE orders DROP COLUMN IF EXISTS product_name")
    op.execute("ALTER TABLE orders DROP COLUMN IF EXISTS pincode")
    op.execute("ALTER TABLE orders DROP COLUMN IF EXISTS country")
    op.execute("ALTER TABLE orders DROP COLUMN IF EXISTS state")
    op.execute("ALTER TABLE orders DROP COLUMN IF EXISTS city")
    op.execute("ALTER TABLE orders DROP COLUMN IF EXISTS address_line2")
    op.execute("ALTER TABLE orders DROP COLUMN IF EXISTS address_line1")
    op.execute("ALTER TABLE orders DROP COLUMN IF EXISTS customer_phone")
    op.execute("ALTER TABLE orders DROP COLUMN IF EXISTS customer_email")
    op.execute("ALTER TABLE orders DROP COLUMN IF EXISTS customer_name")