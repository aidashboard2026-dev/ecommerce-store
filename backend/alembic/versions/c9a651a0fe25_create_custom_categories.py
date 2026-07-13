"""create custom categories

Revision ID: c9a651a0fe25
Revises: e7f8a9b1c2d3
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c9a651a0fe25"
down_revision: Union[str, None] = "e7f8a9b1c2d3"
branch_labels = None
depends_on = "9989daa8d9aa"


def upgrade() -> None:

    # ----------------------------
    # Create custom_categories table
    # ----------------------------

    op.create_table(
        "custom_categories",

        sa.Column("id", sa.Integer(), primary_key=True),

        sa.Column(
            "name",
            sa.String(100),
            nullable=False,
        ),

        sa.Column(
            "slug",
            sa.String(120),
            nullable=False,
        ),

        sa.Column(
            "description",
            sa.Text(),
            nullable=True,
        ),

        sa.Column(
            "status",
            sa.String(20),
            nullable=False,
            server_default="active",
        ),

        sa.Column(
            "sort_order",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),

        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
        ),

        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
        ),

        sa.UniqueConstraint("name"),
        sa.UniqueConstraint("slug"),
    )

    op.create_index(
        "ix_custom_categories_slug",
        "custom_categories",
        ["slug"],
    )

    op.create_index(
        "ix_custom_categories_status",
        "custom_categories",
        ["status"],
    )

    op.create_index(
        "ix_custom_categories_sort_order",
        "custom_categories",
        ["sort_order"],
    )

    # -------------------------------------------------------------
    # Add custom_category_id column to custom_products if missing
    # -------------------------------------------------------------
    op.execute(
        "ALTER TABLE custom_products "
        "ADD COLUMN IF NOT EXISTS custom_category_id INTEGER"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_custom_products_custom_category_id "
        "ON custom_products (custom_category_id)"
    )

    # ----------------------------------
    # Add FK
    # ----------------------------------
    op.create_foreign_key(
        "fk_custom_category",
        "custom_products",
        "custom_categories",
        ["custom_category_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:

    op.drop_constraint(
        "fk_custom_category",
        "custom_products",
        type_="foreignkey",
    )

    op.execute("DROP INDEX IF EXISTS ix_custom_products_custom_category_id")
    op.execute("ALTER TABLE custom_products DROP COLUMN IF EXISTS custom_category_id")

    op.drop_index(
        "ix_custom_categories_sort_order",
        table_name="custom_categories",
    )

    op.drop_index(
        "ix_custom_categories_status",
        table_name="custom_categories",
    )

    op.drop_index(
        "ix_custom_categories_slug",
        table_name="custom_categories",
    )

    op.drop_table("custom_categories")