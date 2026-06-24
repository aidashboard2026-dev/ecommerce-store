"""merge_custom_products_orders_settings

Revision ID: c3c762ea9642
Revises: 9989daa8d9aa, b2c3d4e5f6a7, a8b9c0d1e2f3
Create Date: 2026-06-23 17:27:21.148825

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c3c762ea9642'
down_revision: Union[str, None] = ('9989daa8d9aa', 'b2c3d4e5f6a7', 'a8b9c0d1e2f3')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
