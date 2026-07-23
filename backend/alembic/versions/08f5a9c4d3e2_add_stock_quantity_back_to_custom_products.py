"""add_stock_quantity_back_to_custom_products

Revision ID: 08f5a9c4d3e2
Revises: 47a716e9c877
Create Date: 2026-07-21 00:55:24.753570

Adds stock_quantity INTEGER column back to custom_products.
The column was previously dropped by drop_dead_custom_product_columns
but is required by the Admin Stock Quantity feature.

Business rule: Custom Products are WhatsApp-enquiry-based. Stock is
display-only — no inventory deduction, no variant-level stock, and
no order creation is triggered from the stock value.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "08f5a9c4d3e2"
down_revision: Union[str, None] = "47a716e9c877"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE custom_products "
        "ADD COLUMN IF NOT EXISTS stock_quantity INTEGER NOT NULL DEFAULT 0"
    )


def downgrade() -> None:
    op.execute(
        "ALTER TABLE custom_products "
        "DROP COLUMN IF EXISTS stock_quantity"
    )
