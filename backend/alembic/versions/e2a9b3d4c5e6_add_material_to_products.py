"""add_material_to_products

Revision ID: e2a9b3d4c5e6
Revises: 12b858691118
Create Date: 2026-06-30 13:05:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e2a9b3d4c5e6'
down_revision: Union[str, None] = '12b858691118'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    op.add_column(
        "products",
        sa.Column(
            "material",
            sa.String(length=255),
            nullable=True,
        ),
    )


def downgrade():
    op.drop_column("products", "material")