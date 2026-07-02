"""remove sub collections add gender

Revision ID: f3a4b5c6d7e8
Revises: e2a9b3d4c5e6
Create Date: 2026-06-30 19:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'f3a4b5c6d7e8'
down_revision: Union[str, None] = 'e2a9b3d4c5e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    # Create product_genders table
    op.create_table(
        'product_genders',
        sa.Column('product_id', sa.Integer(), nullable=False),
        sa.Column('gender', sa.String(length=50), nullable=False),
        sa.ForeignKeyConstraint(['product_id'], ['products.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('product_id', 'gender')
    )
    op.create_index('ix_product_genders_product_id', 'product_genders', ['product_id'], unique=False)
    op.create_index('ix_product_genders_gender', 'product_genders', ['gender'], unique=False)

    # Drop column collection from products
    op.drop_column('products', 'collection')


def downgrade():
    # Add column collection to products
    op.add_column('products', sa.Column('collection', sa.VARCHAR(length=100), autoincrement=False, nullable=True))
    
    # Drop product_genders table
    op.drop_index('ix_product_genders_gender', table_name='product_genders')
    op.drop_index('ix_product_genders_product_id', table_name='product_genders')
    op.drop_table('product_genders')

