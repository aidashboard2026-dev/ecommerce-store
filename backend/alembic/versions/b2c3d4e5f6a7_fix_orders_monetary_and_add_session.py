"""fix orders monetary columns and add cart_session_id

Revision ID: b2c3d4e5f6a7
Revises: a9b1c2d3e4f5
Create Date: 2026-06-22 10:30:00.000000

Two changes to the orders table:

1. Fix Float monetary columns to Numeric(10, 2).
   IEEE 754 floating-point cannot represent all decimal values exactly.
   Financial data (price, total_amount) must use Numeric to avoid rounding
   errors such as 999.99 being stored as 999.9900000000001.

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


# revision identifiers, used by Alembic.
revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, None] = 'a9b1c2d3e4f5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Fix price: Float → Numeric(10, 2)
    # USING clause converts existing float data cleanly during the ALTER.
    op.alter_column(
        'orders',
        'price',
        existing_type=sa.Float(),
        type_=sa.Numeric(precision=10, scale=2),
        postgresql_using='price::numeric(10, 2)',
        existing_nullable=True,
    )

    # Fix total_amount: Float → Numeric(10, 2)
    op.alter_column(
        'orders',
        'total_amount',
        existing_type=sa.Float(),
        type_=sa.Numeric(precision=10, scale=2),
        postgresql_using='total_amount::numeric(10, 2)',
        existing_nullable=True,
    )

    # Add cart_session_id — nullable, no default, no index required at this stage
    op.add_column(
        'orders',
        sa.Column('cart_session_id', sa.String(length=50), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('orders', 'cart_session_id')

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
