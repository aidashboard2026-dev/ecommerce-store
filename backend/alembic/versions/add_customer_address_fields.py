"""add customer address fields and merge heads

Revision ID: add_customer_address_fields
Revises: 2d100eaa3cdb, add_razorpay_cols_orders
Create Date: 2026-07-13 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_customer_address_fields'
down_revision: Union[str, Sequence[str], None] = ('2d100eaa3cdb', 'add_razorpay_cols_orders')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Address Line 1
    op.execute(
        "ALTER TABLE customers ADD COLUMN IF NOT EXISTS "
        "address_line1 VARCHAR(255)"
    )

    # 2. Address Line 2
    op.execute(
        "ALTER TABLE customers ADD COLUMN IF NOT EXISTS "
        "address_line2 VARCHAR(255)"
    )

    # 3. Pincode
    op.execute(
        "ALTER TABLE customers ADD COLUMN IF NOT EXISTS "
        "pincode VARCHAR(20)"
    )

    # 4. created_at index
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_customers_created_at "
        "ON customers (created_at)"
    )

    # 5. updated_at: ensure it has DEFAULT NOW() and is NOT NULL
    # For idempotency, we set a value for existing rows before ALTER COLUMN NOT NULL.
    op.execute("UPDATE customers SET updated_at = NOW() WHERE updated_at IS NULL")
    op.execute("ALTER TABLE customers ALTER COLUMN updated_at SET DEFAULT NOW()")
    op.execute("ALTER TABLE customers ALTER COLUMN updated_at SET NOT NULL")


def downgrade() -> None:
    # Revert updated_at settings
    op.execute("ALTER TABLE customers ALTER COLUMN updated_at DROP DEFAULT")
    op.execute("ALTER TABLE customers ALTER COLUMN updated_at DROP NOT NULL")

    # Drop index
    op.execute("DROP INDEX IF EXISTS ix_customers_created_at")

    # Drop columns
    op.execute("ALTER TABLE customers DROP COLUMN IF EXISTS pincode")
    op.execute("ALTER TABLE customers DROP COLUMN IF EXISTS address_line2")
    op.execute("ALTER TABLE customers DROP COLUMN IF EXISTS address_line1")
