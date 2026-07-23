"""merge categories_enhancements and auth_columns heads

Revision ID: i1j2k3l4m5n6
Revises: g1h2i3j4k5l6, h1i2j3k4l5m6
Create Date: 2026-06-27 01:00:00.000000

Merges the two parallel heads that both descended from 0000000000ff:
  - g1h2i3j4k5l6 (categories_collections_enhancements)
  - h1i2j3k4l5m6 (add_auth_columns_to_customers)
"""
from typing import Sequence, Union
from alembic import op

revision: str = 'i1j2k3l4m5n6'
down_revision: Union[str, Sequence[str], None] = ('g1h2i3j4k5l6', 'h1i2j3k4l5m6')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
