"""add whatsapp message to custom products

Revision ID: add_whatsapp_message_to_custom_products
Revises: add_customer_address_fields
Create Date: 2026-07-13 13:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'cp_whatsapp_msg'
down_revision: Union[str, Sequence[str], None] = 'add_customer_address_fields'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add whatsapp_message column to custom_products if not exists
    op.execute(
        "ALTER TABLE custom_products ADD COLUMN IF NOT EXISTS "
        "whatsapp_message TEXT"
    )


def downgrade() -> None:
    # Drop column
    op.execute("ALTER TABLE custom_products DROP COLUMN IF EXISTS whatsapp_message")
