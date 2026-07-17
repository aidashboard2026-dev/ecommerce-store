"""add deleted_at column to product_variants

Revision ID: prod_var_deleted_at
Revises: cp_whatsapp_msg
Create Date: 2026-07-17

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'prod_var_deleted_at'
down_revision: Union[str, Sequence[str], None] = 'cp_whatsapp_msg'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'product_variants',
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        op.f('ix_product_variants_deleted_at'),
        'product_variants',
        ['deleted_at'],
    )


def downgrade() -> None:
    op.drop_index(op.f('ix_product_variants_deleted_at'), table_name='product_variants')
    op.drop_column('product_variants', 'deleted_at')
