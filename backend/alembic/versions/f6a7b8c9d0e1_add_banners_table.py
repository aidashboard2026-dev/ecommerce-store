"""add banners table

Revision ID: f6a7b8c9d0e1
Revises: e5f6a7b8c9d0
Create Date: 2026-06-12

Creates the `banners` table used by the Banner Management module
(hero sliders, homepage/category/sidebar/popup marketing banners).
"""

from alembic import op
import sqlalchemy as sa

revision = "f6a7b8c9d0e1"
down_revision = "e5f6a7b8c9d0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "banners",

        sa.Column("id", sa.Integer(), nullable=False),

        sa.Column(
            "title",
            sa.String(length=255),
            nullable=False,
        ),

        sa.Column(
            "subtitle",
            sa.String(length=500),
            nullable=True,
        ),

        sa.Column(
            "banner_image",
            sa.String(length=500),
            nullable=True,
        ),

        sa.Column(
            "cta_text",
            sa.String(length=100),
            nullable=True,
        ),

        sa.Column(
            "cta_link",
            sa.String(length=500),
            nullable=True,
        ),

        sa.Column(
            "placement",
            sa.String(length=50),
            nullable=False,
            server_default="hero",
        ),

        sa.Column(
            "sort_order",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),

        sa.Column(
            "is_active",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),

        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("now()"),
            nullable=True,
        ),

        sa.Column(
            "updated_at",
            sa.DateTime(),
            server_default=sa.text("now()"),
            nullable=True,
        ),

        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(op.f("ix_banners_id"), "banners", ["id"], unique=False)
    op.create_index("ix_banners_placement", "banners", ["placement"])
    op.create_index("ix_banners_is_active", "banners", ["is_active"])


def downgrade() -> None:
    op.drop_index("ix_banners_is_active", table_name="banners")
    op.drop_index("ix_banners_placement", table_name="banners")
    op.drop_index(op.f("ix_banners_id"), table_name="banners")
    op.drop_table("banners")