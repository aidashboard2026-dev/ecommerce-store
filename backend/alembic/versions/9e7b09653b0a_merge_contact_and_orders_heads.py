"""merge contact and orders heads

Revision ID: 9e7b09653b0a
Revises: f9a8b7c6d5e4, k2l3m4n5o6p7
Create Date: 2026-07-06 10:32:29.086117

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9e7b09653b0a'
down_revision: Union[str, None] = ('f9a8b7c6d5e4', 'k2l3m4n5o6p7')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
