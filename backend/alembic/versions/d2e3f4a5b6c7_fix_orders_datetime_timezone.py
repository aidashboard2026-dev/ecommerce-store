"""fix orders datetime timezone

Convert all Order timestamp columns from naive TIMESTAMP to timezone-aware
TIMESTAMPTZ so Python datetime.now(timezone.utc) comparisons in the
dashboard do not raise TypeError on Python 3.11+.

Revision ID: d2e3f4a5b6c7
Revises: c3c762ea9642
Create Date: 2026-06-26
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import TIMESTAMP

# revision identifiers
revision = "d2e3f4a5b6c7"
down_revision = "c3c762ea9642"
branch_labels = None
depends_on = None

_COLUMNS = ("ordered_at", "created_at", "updated_at", "expected_delivery_date")


def upgrade() -> None:
    for col in _COLUMNS:
        op.execute(
            f"ALTER TABLE orders "
            f"ALTER COLUMN {col} TYPE TIMESTAMPTZ "
            f"USING {col} AT TIME ZONE 'UTC'"
        )


def downgrade() -> None:
    for col in _COLUMNS:
        op.execute(
            f"ALTER TABLE orders "
            f"ALTER COLUMN {col} TYPE TIMESTAMP WITHOUT TIME ZONE "
            f"USING {col} AT TIME ZONE 'UTC'"
        )
