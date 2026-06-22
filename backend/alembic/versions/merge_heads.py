"""merge heads

Revision ID: 0000000000ff
Revises: a1b2c3d4e5f6, f6a7b8c9d0e1
Create Date: 2026-06-14 15:00:00.000000

"""
from typing import Sequence, Union
from alembic import op

# revision identifiers, used by Alembic.
revision: str = '0000000000ff'
down_revision: Union[str, Sequence[str], None] = ('a1b2c3d4e5f6', 'f6a7b8c9d0e1')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass