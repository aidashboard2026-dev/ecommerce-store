"""add offers table

Revision ID: e5f6a7b8c9d0
Revises: d1e2f3a4b5c6
Create Date: 2026-06-11

Creates the `offers` table used by the Offers module.
All columns are nullable except id and title — safe for zero-downtime deployment.
"""

from alembic import op
import sqlalchemy as sa

revision = "e5f6a7b8c9d0"
down_revision = "d1e2f3a4b5c6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "offers",

        sa.Column("id", sa.Integer(), nullable=False),

        sa.Column(
            "title",
            sa.String(length=255),
            nullable=False,
        ),

        sa.Column(
            "percentage",
            sa.String(length=50),
            nullable=True,
        ),

        sa.Column(
            "description",
            sa.Text(),
            nullable=True,
        ),

        sa.Column(
            "banner_image",
            sa.String(length=500),
            nullable=True,
        ),

        sa.Column(
            "status",
            sa.String(length=20),
            nullable=False,
            server_default="saved",
        ),

        sa.Column(
            "start_date",
            sa.Date(),
            nullable=True,
        ),

        sa.Column(
            "end_date",
            sa.Date(),
            nullable=True,
        ),

        sa.Column(
            "start_time",
            sa.Time(),
            nullable=True,
        ),

        sa.Column(
            "end_time",
            sa.Time(),
            nullable=True,
        ),

        sa.Column(
            "published_at",
            sa.DateTime(),
            nullable=True,
        ),

        sa.Column(
            "expires_at",
            sa.DateTime(),
            nullable=True,
        ),

        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("now()"),
            nullable=True,
        ),

        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(op.f("ix_offers_id"), "offers", ["id"], unique=False)
    op.create_index("ix_offers_status", "offers", ["status"])


def downgrade() -> None:
    op.drop_index("ix_offers_status", table_name="offers")
    op.drop_index(op.f("ix_offers_id"), table_name="offers")
    op.drop_table("offers")
