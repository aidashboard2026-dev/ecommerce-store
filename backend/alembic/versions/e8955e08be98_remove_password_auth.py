"""remove customer password auth and add Firebase profile fields

Revision ID: e8955e08be98
Revises: 150b61e58517, razorpay_orders_fields
Create Date: 2026-07-09 01:31:53.131473

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision: str = "e8955e08be98"
down_revision: Union[str, Sequence[str], None] = (
    "150b61e58517",
    "razorpay_orders_fields",
)
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _columns(table_name: str) -> set[str]:
    bind = op.get_bind()
    inspector = inspect(bind)
    return {column["name"] for column in inspector.get_columns(table_name)}


def upgrade() -> None:
    columns = _columns("customers")

    if "photo_url" not in columns:
        op.add_column(
            "customers",
            sa.Column("photo_url", sa.String(length=1000), nullable=True),
        )

    if "google_name" not in columns:
        op.add_column(
            "customers",
            sa.Column("google_name", sa.String(length=255), nullable=True),
        )

    op.execute(
        """
        UPDATE customers
        SET auth_provider = 'firebase'
        WHERE auth_provider IS NULL
           OR auth_provider = ''
           OR auth_provider = 'password';
        """
    )

    op.alter_column(
        "customers",
        "auth_provider",
        existing_type=sa.String(length=30),
        nullable=False,
        server_default="firebase",
    )

    op.execute("DROP INDEX IF EXISTS ix_customers_password_reset_token;")

    columns = _columns("customers")

    for column_name in (
        "password_reset_expires",
        "password_reset_token",
        "password_hash",
    ):
        if column_name in columns:
            op.drop_column("customers", column_name)


def downgrade() -> None:
    columns = _columns("customers")

    if "google_name" in columns:
        op.drop_column("customers", "google_name")

    if "photo_url" in columns:
        op.drop_column("customers", "photo_url")

    op.alter_column(
        "customers",
        "auth_provider",
        existing_type=sa.String(length=30),
        nullable=False,
        server_default="password",
    )

    # Customer password authentication is intentionally not restored by this
    # downgrade. Re-adding password columns without the removed application flow
    # would create misleading, unusable schema surface.
