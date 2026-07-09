"""restore missing razorpay orders revision node

Revision ID: razorpay_orders_fields
Revises: e7f8a9b1c2d3
Create Date: 2026-07-09 02:00:00.000000

This compatibility revision repairs deployments whose alembic_version table
already references the historical razorpay_orders_fields revision while the
local migration file is missing. Razorpay-specific order columns are not part
of the current SQLAlchemy order model, so this node is intentionally no-op.
"""
from typing import Sequence, Union


revision: str = "razorpay_orders_fields"
down_revision: Union[str, None] = "e7f8a9b1c2d3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
