"""add razorpay columns to orders

Revision ID: add_razorpay_cols_orders
Revises: razorpay_orders_fields
Create Date: 2026-07-13 00:00:00.000000

The companion revision 'razorpay_orders_fields' was a no-op compatibility
node. No migration ever created the Razorpay-specific columns on the orders
table, so a fresh deployment crashes when the service layer attempts to
read/write razorpay_order_id etc.

Uses ADD COLUMN IF NOT EXISTS throughout — idempotent on both fresh and
existing databases.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "add_razorpay_cols_orders"
down_revision: Union[str, None] = "razorpay_orders_fields"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # razorpay_order_id — VARCHAR(100), nullable, indexed
    op.execute(
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS "
        "razorpay_order_id VARCHAR(100)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_orders_razorpay_order_id "
        "ON orders (razorpay_order_id)"
    )

    # razorpay_payment_id — VARCHAR(100), nullable
    op.execute(
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS "
        "razorpay_payment_id VARCHAR(100)"
    )

    # razorpay_signature — VARCHAR(200), nullable
    op.execute(
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS "
        "razorpay_signature VARCHAR(200)"
    )

    # payment_verified_at — TIMESTAMPTZ, nullable
    op.execute(
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS "
        "payment_verified_at TIMESTAMPTZ"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_orders_razorpay_order_id")
    op.execute("ALTER TABLE orders DROP COLUMN IF EXISTS payment_verified_at")
    op.execute("ALTER TABLE orders DROP COLUMN IF EXISTS razorpay_signature")
    op.execute("ALTER TABLE orders DROP COLUMN IF EXISTS razorpay_payment_id")
    op.execute("ALTER TABLE orders DROP COLUMN IF EXISTS razorpay_order_id")
