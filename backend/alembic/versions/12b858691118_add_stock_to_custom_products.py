"""add_stock_to_custom_products

Revision ID: 12b858691118
Revises: b3d4e5f6a7b8
Create Date: 2026-06-30 06:39:29.422995
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '12b858691118'
down_revision: Union[str, None] = 'b3d4e5f6a7b8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    # Only add columns if they don't already exist to support fresh database migration
    op.execute(
        "ALTER TABLE custom_products "
        "ADD COLUMN IF NOT EXISTS stock_quantity INTEGER NOT NULL DEFAULT 0"
    )

    op.execute(
        "ALTER TABLE custom_products "
        "ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER NOT NULL DEFAULT 5"
    )

    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_custom_products_stock_quantity "
        "ON custom_products (stock_quantity)"
    )

    op.execute(
        "ALTER TABLE custom_products "
        "ADD COLUMN IF NOT EXISTS size VARCHAR(100) NULL"
    )

    # Set default values for any legacy row
    op.execute(
        "UPDATE custom_products SET size='All Size' WHERE size IS NULL"
    )

    # Make size non-nullable
    op.execute(
        "ALTER TABLE custom_products ALTER COLUMN size SET NOT NULL"
    )


def downgrade():
    op.execute("DROP INDEX IF EXISTS ix_custom_products_stock_quantity")
    op.execute("ALTER TABLE custom_products DROP COLUMN IF EXISTS size")
    op.execute("ALTER TABLE custom_products DROP COLUMN IF EXISTS low_stock_threshold")
    op.execute("ALTER TABLE custom_products DROP COLUMN IF EXISTS stock_quantity")