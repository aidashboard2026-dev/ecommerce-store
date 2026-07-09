"""add store location to settings

Revision ID: add_store_location_field
Revises: razorpay_orders_fields
Create Date: 2026-07-09
"""

from typing import Union
from alembic import op
import sqlalchemy as sa

revision = "add_store_location_field"
down_revision: Union[str, None] = "razorpay_orders_fields"
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.add_column("settings", sa.Column("store_location", sa.Text(), nullable=True))

def downgrade() -> None:
    op.drop_column("settings", "store_location")
