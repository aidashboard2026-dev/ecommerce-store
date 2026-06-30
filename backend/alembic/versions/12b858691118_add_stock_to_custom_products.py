"""add_stock_to_custom_products

Revision ID: 12b858691118
Revises: b3d4e5f6a7b8
Create Date: 2026-06-30 06:39:29.422995

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '12b858691118'
down_revision: Union[str, None] = 'b3d4e5f6a7b8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None
def upgrade():
    op.add_column(
        "custom_products",
        sa.Column(
            "stock_quantity",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
    )

    op.add_column(
        "custom_products",
        sa.Column(
            "low_stock_threshold",
            sa.Integer(),
            nullable=False,
            server_default="5",
        ),
    )

    op.create_index(
        "ix_custom_products_stock_quantity",
        "custom_products",
        ["stock_quantity"],
    )

    op.alter_column(
        "custom_products",
        "stock_quantity",
        server_default=None,
    )

    op.alter_column(
        "custom_products",
        "low_stock_threshold",
        server_default=None,
    )


def downgrade():
    op.drop_index(
        "ix_custom_products_stock_quantity",
        table_name="custom_products",
    )

    op.drop_column(
        "custom_products",
        "low_stock_threshold",
    )

    op.drop_column(
        "custom_products",
        "stock_quantity",
    )