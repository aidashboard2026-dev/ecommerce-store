"""add logistics and tracking_id

Revision ID: f7b8c9d0e1f2
Revises: e5f6a7b8c9d0
Create Date: 2026-06-17 12:00:00.000000

Add nullable logistics and tracking_id columns to orders.
"""

from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "f7b8c9d0e1f2"
down_revision: Union[str, None] = "e5f6a7b8c9d0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        ALTER TABLE orders
        ADD COLUMN IF NOT EXISTS logistics VARCHAR(100)
    """)

    op.execute("""
        ALTER TABLE orders
        ADD COLUMN IF NOT EXISTS tracking_id VARCHAR(100)
    """)


def downgrade() -> None:
    op.execute("""
        ALTER TABLE orders
        DROP COLUMN IF EXISTS tracking_id
    """)

    op.execute("""
        ALTER TABLE orders
        DROP COLUMN IF EXISTS logistics
    """)