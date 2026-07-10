"""add shipping fee to orders

Revision ID: add_shipping_fee_to_orders
Revises: e8955e08be98, add_store_location_field
Create Date: 2026-07-10 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision = "add_shipping_fee_to_orders"
down_revision: Union[str, Sequence[str], None] = ("e8955e08be98", "add_store_location_field")
branch_labels = None
depends_on = None

def _columns(table_name: str) -> set[str]:
    bind = op.get_bind()
    inspector = inspect(bind)
    return {column["name"] for column in inspector.get_columns(table_name)}

def upgrade() -> None:
    columns = _columns("orders")
    if "shipping_fee" not in columns:
        op.add_column(
            "orders",
            sa.Column("shipping_fee", sa.Numeric(precision=10, scale=2), nullable=False, server_default="0.00"),
        )

def downgrade() -> None:
    columns = _columns("orders")
    if "shipping_fee" in columns:
        op.drop_column("orders", "shipping_fee")
