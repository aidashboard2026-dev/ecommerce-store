"""add index to orders customer_email

Revision ID: k2l3m4n5o6p7
Revises: j1k2l3m4n5o6
Create Date: 2026-07-02
"""

from typing import Union

from alembic import op
import sqlalchemy as sa


revision: str = "k2l3m4n5o6p7"
down_revision: Union[str, None] = "j1k2l3m4n5o6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index('ix_orders_customer_email', 'orders', ['customer_email'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_orders_customer_email', table_name='orders')