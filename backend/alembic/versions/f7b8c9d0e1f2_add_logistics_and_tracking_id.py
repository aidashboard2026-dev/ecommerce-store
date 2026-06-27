"""add logistics and tracking_id

Revision ID: f7b8c9d0e1f2
Revises: e5f6a7b8c9d0
Create Date: 2026-06-17 12:00:00.000000

Add nullable `logistics` and `tracking_id` string columns to `orders`.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'f7b8c9d0e1f2'
down_revision: Union[str, None] = 'e5f6a7b8c9d0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    existing_columns = {
        column["name"]
        for column in sa.inspect(op.get_bind()).get_columns("orders")
    }

    if "logistics" not in existing_columns:
        op.add_column('orders', sa.Column('logistics', sa.String(length=100), nullable=True))
    if "tracking_id" not in existing_columns:
        op.add_column('orders', sa.Column('tracking_id', sa.String(length=100), nullable=True))


def downgrade() -> None:
    existing_columns = {
        column["name"]
        for column in sa.inspect(op.get_bind()).get_columns("orders")
    }

    if "tracking_id" in existing_columns:
        op.drop_column('orders', 'tracking_id')
    if "logistics" in existing_columns:
        op.drop_column('orders', 'logistics')
