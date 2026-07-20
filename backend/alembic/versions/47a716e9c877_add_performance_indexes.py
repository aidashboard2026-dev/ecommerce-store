"""add_performance_indexes

Revision ID: 47a716e9c877
Revises: b4e5f6a7c8d9
Create Date: 2026-07-20 22:51:19.007435

Adds 3 composite indexes for performance-critical queries:
  - ix_orders_pending_expiry: filters by payment_status + tracking_status + ordered_at
  - ix_orders_customer_history: filters and sorts by customer_email + ordered_at
  - ix_admin_notif_unread: filters by is_read + created_at
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "47a716e9c877"
down_revision: Union[str, None] = "b4e5f6a7c8d9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ix_orders_pending_expiry — covering index for release_expired_reservations
    op.create_index(
        "ix_orders_pending_expiry",
        "orders",
        ["payment_status", "tracking_status", "ordered_at"],
        unique=False,
        postgresql_where=None,
    )
    # ix_orders_customer_history — covering index for customer order history listing
    op.create_index(
        "ix_orders_customer_history",
        "orders",
        ["customer_email", "ordered_at"],
        unique=False,
    )
    # ix_admin_notif_unread — covering index for unread notification badge count
    op.create_index(
        "ix_admin_notif_unread",
        "admin_notifications",
        ["is_read", "created_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_orders_pending_expiry", table_name="orders")
    op.drop_index("ix_orders_customer_history", table_name="orders")
    op.drop_index("ix_admin_notif_unread", table_name="admin_notifications")
