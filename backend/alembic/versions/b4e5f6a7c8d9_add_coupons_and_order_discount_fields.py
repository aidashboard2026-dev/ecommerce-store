"""add coupons, coupon_usages tables and order discount fields

Revision ID: b4e5f6a7c8d9
Revises: prod_var_deleted_at, drop_dead_custom_product_columns
Create Date: 2026-07-18

Safe, additive-only migration:
  - CREATE TABLE IF NOT EXISTS for coupons
  - CREATE TABLE IF NOT EXISTS for coupon_usages
  - ADD COLUMN IF NOT EXISTS for orders.coupon_code
  - ADD COLUMN IF NOT EXISTS for orders.discount_amount
  - CREATE INDEX IF NOT EXISTS for all new indexes

No DROP TABLE, DROP COLUMN, DROP CONSTRAINT, DROP INDEX, or destructive ALTER.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b4e5f6a7c8d9"
down_revision: Union[str, Sequence[str], None] = (
    "prod_var_deleted_at",
    "drop_dead_custom_product_columns",
)
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:

    # ─────────────────────────────────────────────────────────
    # coupons table
    # ─────────────────────────────────────────────────────────
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS coupons (
            id                  SERIAL PRIMARY KEY,
            code                VARCHAR(50) NOT NULL,
            discount_percent    NUMERIC(5, 2) NOT NULL,
            max_discount        NUMERIC(10, 2),
            min_order           NUMERIC(10, 2) DEFAULT 0,
            max_uses            INTEGER DEFAULT 0,
            max_uses_per_user   INTEGER DEFAULT 0,
            is_active           BOOLEAN DEFAULT TRUE,
            valid_from          TIMESTAMP WITH TIME ZONE NOT NULL,
            valid_until         TIMESTAMP WITH TIME ZONE,
            created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
        """
    )

    op.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS ix_coupons_code ON coupons (code)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_coupons_id ON coupons (id)"
    )

    # ─────────────────────────────────────────────────────────
    # coupon_usages table
    # ─────────────────────────────────────────────────────────
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS coupon_usages (
            id               SERIAL PRIMARY KEY,
            coupon_id        INTEGER NOT NULL,
            order_id         INTEGER NOT NULL,
            customer_email   VARCHAR(255) NOT NULL,
            used_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
        """
    )

    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_coupon_usages_coupon_id ON coupon_usages (coupon_id)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_coupon_usages_customer_email ON coupon_usages (customer_email)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_coupon_usages_id ON coupon_usages (id)"
    )

    # ─────────────────────────────────────────────────────────
    # orders — add coupon fields
    # ─────────────────────────────────────────────────────────
    op.execute(
        """
        ALTER TABLE orders
        ADD COLUMN IF NOT EXISTS coupon_code VARCHAR(50)
        """
    )

    op.execute(
        """
        ALTER TABLE orders
        ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10, 2) DEFAULT 0
        """
    )

    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_orders_coupon_code ON orders (coupon_code)"
    )


def downgrade() -> None:

    op.execute("DROP INDEX IF EXISTS ix_orders_coupon_code")
    op.execute("ALTER TABLE orders DROP COLUMN IF EXISTS discount_amount")
    op.execute("ALTER TABLE orders DROP COLUMN IF EXISTS coupon_code")

    op.execute("DROP INDEX IF EXISTS ix_coupon_usages_id")
    op.execute("DROP INDEX IF EXISTS ix_coupon_usages_customer_email")
    op.execute("DROP INDEX IF EXISTS ix_coupon_usages_coupon_id")
    op.execute("DROP TABLE IF EXISTS coupon_usages")

    op.execute("DROP INDEX IF EXISTS ix_coupons_id")
    op.execute("DROP INDEX IF EXISTS ix_coupons_code")
    op.execute("DROP TABLE IF EXISTS coupons")
