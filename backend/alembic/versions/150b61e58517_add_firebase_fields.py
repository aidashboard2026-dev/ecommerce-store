"""add firebase fields

Revision ID: 150b61e58517
Revises: add_destination_routing_fields
Create Date: 2026-07-08 09:05:03.944158

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '150b61e58517'
down_revision: Union[str, None] = 'add_destination_routing_fields'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():

    op.add_column(
        "customers",
        sa.Column(
            "firebase_uid",
            sa.String(length=128),
            nullable=True,
        ),
    )

    op.add_column(
        "customers",
        sa.Column(
            "auth_provider",
            sa.String(length=30),
            nullable=False,
            server_default="password",
        ),
    )

    op.create_index(
        "ix_customers_firebase_uid",
        "customers",
        ["firebase_uid"],
        unique=True,
    )


def downgrade():

    op.drop_index(
        "ix_customers_firebase_uid",
        table_name="customers",
    )

    op.drop_column(
        "customers",
        "auth_provider",
    )

    op.drop_column(
        "customers",
        "firebase_uid",
    )