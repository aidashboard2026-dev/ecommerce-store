"""add product_id to orders

Revision ID: a1b2c3d4e5f6
Revises: dee988a94348
Create Date: 2026-06-14

Adds a nullable product_id column to the orders table.
Used by the storefront order endpoint for reliable inventory
decrement (avoids fragile product title string matching).
"""
from alembic import op
import sqlalchemy as sa

revision = 'a1b2c3d4e5f6'
down_revision = 'dee988a94348'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'orders',
        sa.Column('product_id', sa.Integer(), nullable=True)
    )
    op.create_index('ix_orders_product_id', 'orders', ['product_id'])


def downgrade() -> None:
    op.drop_index('ix_orders_product_id', table_name='orders')
    op.drop_column('orders', 'product_id')
