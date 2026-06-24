"""create delivery_zones table

Revision ID: a9b1c2d3e4f5
Revises: 88171fe87ea7
Create Date: 2026-06-22 10:00:00.000000

delivery_zones model existed in app/models/delivery_zone.py but had no
corresponding migration, meaning the table was never created in the database.
Any query against DeliveryZone raised UndefinedTable at runtime.

This migration creates the table to match the existing SQLAlchemy model exactly.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a9b1c2d3e4f5'
down_revision: Union[str, None] = '88171fe87ea7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'delivery_zones',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('city', sa.String(length=100), nullable=True),
        sa.Column('delivery_days', sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('city'),
    )
    op.create_index(
        op.f('ix_delivery_zones_id'),
        'delivery_zones',
        ['id'],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f('ix_delivery_zones_id'), table_name='delivery_zones')
    op.drop_table('delivery_zones')
