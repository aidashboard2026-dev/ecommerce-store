"""add destination routing fields

Revision ID: add_destination_routing_fields
Revises: 9e7b09653b0a
Create Date: 2026-07-07
"""

from typing import Union
from alembic import op
import sqlalchemy as sa

revision: str = "add_destination_routing_fields"
down_revision: Union[str, None] = "9e7b09653b0a"
branch_labels = None
depends_on = None

def upgrade() -> None:
    # Banners table updates
    op.add_column("banners", sa.Column("destination_type", sa.String(length=50), nullable=True))
    op.add_column("banners", sa.Column("destination_id", sa.Integer(), nullable=True))

    # Homepage categories table updates
    op.add_column("homepage_categories", sa.Column("destination_type", sa.String(length=50), nullable=True))
    op.add_column("homepage_categories", sa.Column("destination_id", sa.Integer(), nullable=True))
    op.alter_column("homepage_categories", "path", existing_type=sa.String(length=500), nullable=True)

def downgrade() -> None:
    op.alter_column("homepage_categories", "path", existing_type=sa.String(length=500), nullable=False)
    op.drop_column("homepage_categories", "destination_id")
    op.drop_column("homepage_categories", "destination_type")
    op.drop_column("banners", "destination_id")
    op.drop_column("banners", "destination_type")
