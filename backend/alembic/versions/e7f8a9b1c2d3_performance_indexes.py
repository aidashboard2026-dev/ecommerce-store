"""add performance indexes for queries and sorting

Revision ID: e7f8a9b1c2d3
Revises: i1j2k3l4m5n6, d2e3f4a5b6c7
Create Date: 2026-06-27 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e7f8a9b1c2d3'
down_revision: Union[str, Sequence[str], None] = ('i1j2k3l4m5n6', 'd2e3f4a5b6c7')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Indexes on orders
    op.create_index('ix_orders_payment_status', 'orders', ['payment_status'])
    op.create_index('ix_orders_tracking_status', 'orders', ['tracking_status'])
    op.create_index('ix_orders_ordered_at', 'orders', ['ordered_at'])

    # Indexes on product variants
    op.create_index('ix_product_variants_selling_price', 'product_variants', ['selling_price'])
    op.create_index('ix_product_variants_stock_quantity', 'product_variants', ['stock_quantity'])
    op.create_index('ix_product_variants_low_stock_threshold', 'product_variants', ['low_stock_threshold'])


def downgrade() -> None:
    op.drop_index('ix_product_variants_low_stock_threshold', table_name='product_variants')
    op.drop_index('ix_product_variants_stock_quantity', table_name='product_variants')
    op.drop_index('ix_product_variants_selling_price', table_name='product_variants')

    op.drop_index('ix_orders_ordered_at', table_name='orders')
    op.drop_index('ix_orders_tracking_status', table_name='orders')
    op.drop_index('ix_orders_payment_status', table_name='orders')
