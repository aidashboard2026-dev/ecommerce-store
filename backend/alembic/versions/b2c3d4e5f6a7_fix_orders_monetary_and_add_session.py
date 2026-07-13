"""fix orders monetary columns and add cart_session_id

Revision ID: b2c3d4e5f6a7
Revises: a9b1c2d3e4f5
Create Date: 2026-06-22 10:30:00.000000

Two changes to the orders table:

1. Promote price and total_amount from FLOAT to NUMERIC(10, 2).
   IEEE 754 floating-point cannot represent all decimal values exactly.
   Financial data (price, total_amount) must use Numeric to avoid rounding
   errors such as 999.99 being stored as 999.9900000000001.

   REPAIR NOTE (2026-07-13):
   The original ALTER COLUMN statements had no guard. On a fresh database
   dee988a94348 now adds price/total_amount as FLOAT, so the ALTER works.
   On an existing database they may already be NUMERIC — the guard checks
   the live column type and skips the ALTER if already correct, preventing
   a "cannot alter type" error.

2. Add cart_session_id (nullable String).
   The current order architecture creates one row per cart item.
   A customer with 3 cart items generates 3 separate order rows, each with
   its own order_number. cart_session_id groups all rows from the same
   checkout session so the admin can filter them together.
   The column is nullable — existing rows are unaffected.
   This is the Phase 1 bridge to a full order_items table in Phase 2.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect, text


# revision identifiers, used by Alembic.
revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, None] = 'a9b1c2d3e4f5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _col_type(col_name: str) -> str:
    """Return the PostgreSQL udt_name for a column in the orders table."""
    conn = op.get_bind()
    result = conn.execute(
        text(
            "SELECT udt_name FROM information_schema.columns "
            "WHERE table_name = 'orders' AND column_name = :col"
        ),
        {"col": col_name},
    ).fetchone()
    return result[0] if result else ""


def upgrade() -> None:
    # ── 1. Promote price: FLOAT → NUMERIC(10, 2) if not already numeric ───────
    if _col_type("price") not in ("numeric",):
        op.alter_column(
            'orders',
            'price',
            existing_type=sa.Float(),
            type_=sa.Numeric(precision=10, scale=2),
            postgresql_using='price::numeric(10, 2)',
            existing_nullable=True,
        )

    # ── 2. Promote total_amount: FLOAT → NUMERIC(10, 2) if not already numeric ─
    if _col_type("total_amount") not in ("numeric",):
        op.alter_column(
            'orders',
            'total_amount',
            existing_type=sa.Float(),
            type_=sa.Numeric(precision=10, scale=2),
            postgresql_using='total_amount::numeric(10, 2)',
            existing_nullable=True,
        )

    # ── 3. Add cart_session_id ─────────────────────────────────────────────────
    op.execute(
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS "
        "cart_session_id VARCHAR(50)"
    )


def downgrade() -> None:
    op.execute("ALTER TABLE orders DROP COLUMN IF EXISTS cart_session_id")

    op.alter_column(
        'orders',
        'total_amount',
        existing_type=sa.Numeric(precision=10, scale=2),
        type_=sa.Float(),
        postgresql_using='total_amount::float',
        existing_nullable=True,
    )

    op.alter_column(
        'orders',
        'price',
        existing_type=sa.Numeric(precision=10, scale=2),
        type_=sa.Float(),
        postgresql_using='price::float',
        existing_nullable=True,
    )
