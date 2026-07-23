"""create admin notifications table

Revision ID: create_admin_notifications
Revises: add_shipping_fee_to_orders
Create Date: 2026-07-10 18:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision = "create_admin_notifications"
down_revision: Union[str, Sequence[str], None] = "add_shipping_fee_to_orders"
branch_labels = None
depends_on = None

def _table_exists(table_name: str) -> bool:
    bind = op.get_bind()
    inspector = inspect(bind)
    return table_name in inspector.get_table_names()

def upgrade() -> None:
    if not _table_exists("admin_notifications"):
        op.create_table(
            "admin_notifications",
            sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
            sa.Column("title", sa.String(length=255), nullable=False),
            sa.Column("message", sa.Text(), nullable=False),
            sa.Column("type", sa.String(length=50), nullable=False, server_default="info"),
            sa.Column("event", sa.String(length=100), nullable=False),
            sa.Column("is_read", sa.Boolean(), nullable=False, server_default=sa.text("false")),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.Column("metadata", sa.JSON(), nullable=True),
        )
        # op.create_index(
        #     "ix_admin_notifications_id",
        #     "admin_notifications",
        #     ["id"],
        #     unique=False,
        # )

def downgrade() -> None:
    if _table_exists("admin_notifications"):
        # op.drop_index("ix_admin_notifications_id", table_name="admin_notifications")
        op.drop_table("admin_notifications")
