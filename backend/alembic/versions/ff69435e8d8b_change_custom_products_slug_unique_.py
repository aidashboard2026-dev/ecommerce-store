"""change custom_products slug unique index to partial unique index

Revision ID: ff69435e8d8b
Revises: 08f5a9c4d3e2
Create Date: 2026-07-24 00:40:16.830352

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ff69435e8d8b'
down_revision: Union[str, None] = '08f5a9c4d3e2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade():
    op.execute("""
        DROP INDEX IF EXISTS ix_custom_products_slug;
    """)

    op.execute("""
        CREATE UNIQUE INDEX IF NOT EXISTS ix_custom_products_slug_active
        ON custom_products(slug)
        WHERE deleted_at IS NULL;
    """)


def downgrade():
    op.execute("""
        DROP INDEX IF EXISTS ix_custom_products_slug_active;
    """)

    op.execute("""
        CREATE UNIQUE INDEX IF NOT EXISTS ix_custom_products_slug
        ON custom_products(slug);
    """)