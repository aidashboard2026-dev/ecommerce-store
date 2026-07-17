"""Drop dead columns from custom_products: stock_quantity, low_stock_threshold, size.

Custom Products are production-based (e.g. embroidery, jersey printing).
They do NOT use inventory tracking, variant sizes, or low-stock alerts —
those belong to the Products domain (ProductVariant).

Revision ID: drop_dead_custom_product_columns
Revises: 12b858691118
Create Date: 2026-07-18
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "drop_dead_custom_product_columns"
down_revision: Union[str, None] = "12b858691118"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column("custom_products", "stock_quantity")
    op.drop_column("custom_products", "low_stock_threshold")
    op.drop_column("custom_products", "size")


def downgrade() -> None:
    op.add_column("custom_products", sa.Column("stock_quantity", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("custom_products", sa.Column("low_stock_threshold", sa.Integer(), nullable=False, server_default="5"))
    op.add_column("custom_products", sa.Column("size", sa.String(100), nullable=False, server_default="All Size"))
    op.alter_column("custom_products", "stock_quantity", server_default=None)
    op.alter_column("custom_products", "low_stock_threshold", server_default=None)
    op.alter_column("custom_products", "size", server_default=None)
