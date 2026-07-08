"""add razorpay fields to orders

Revision ID: razorpay_orders_fields
Revises: add_destination_routing_fields
Create Date: 2026-07-08
"""

from typing import Union
from alembic import op
import sqlalchemy as sa

revision = "razorpay_orders_fields"
down_revision: Union[str, None] = "add_destination_routing_fields"
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.add_column("orders", sa.Column("razorpay_order_id", sa.String(length=100), nullable=True))
    op.add_column("orders", sa.Column("razorpay_payment_id", sa.String(length=100), nullable=True))
    op.add_column("orders", sa.Column("razorpay_signature", sa.String(length=200), nullable=True))
    op.add_column("orders", sa.Column("payment_verified_at", sa.DateTime(timezone=True), nullable=True))
    
    # Create index for razorpay_order_id
    op.create_index("ix_orders_razorpay_order_id", "orders", ["razorpay_order_id"], unique=False)

def downgrade() -> None:
    op.drop_index("ix_orders_razorpay_order_id", table_name="orders")
    op.drop_column("orders", "payment_verified_at")
    op.drop_column("orders", "razorpay_signature")
    op.drop_column("orders", "razorpay_payment_id")
    op.drop_column("orders", "razorpay_order_id")