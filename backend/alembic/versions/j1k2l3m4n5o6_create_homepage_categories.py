"""create homepage categories

Revision ID: j1k2l3m4n5o6
Revises: f3a4b5c6d7e8
Create Date: 2026-07-02
"""

from typing import Union

from alembic import op
import sqlalchemy as sa


revision: str = "j1k2l3m4n5o6"
down_revision: Union[str, None] = "f3a4b5c6d7e8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "homepage_categories",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("image", sa.String(length=500), nullable=False),
        sa.Column("path", sa.String(length=500), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_homepage_categories_id"), "homepage_categories", ["id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_homepage_categories_id"), table_name="homepage_categories")
    op.drop_table("homepage_categories")
