"""merge logistics and product heads

Revision ID: 88171fe87ea7
Revises: f7b8c9d0e1f2, g1h2i3j4k5l6
Create Date: 2026-06-20 19:52:10.284340

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '88171fe87ea7'
down_revision: Union[str, None] = ('f7b8c9d0e1f2', 'g1h2i3j4k5l6')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
