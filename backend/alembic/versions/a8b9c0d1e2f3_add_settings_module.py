"""add settings module

Revision ID: a8b9c0d1e2f3
Revises: f7b8c9d0e1f2
Create Date: 2026-06-21 00:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a8b9c0d1e2f3"
down_revision: Union[str, None] = "f7b8c9d0e1f2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "settings",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("store_name", sa.String(length=150), nullable=False),
        sa.Column("store_url", sa.String(length=500), nullable=False),
        sa.Column("support_email", sa.String(length=255), nullable=False),
        sa.Column("support_phone", sa.String(length=30), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("logo", sa.Text(), nullable=True),
        sa.Column("country", sa.String(length=100), nullable=False),
        sa.Column("currency", sa.String(length=10), nullable=False),
        sa.Column("timezone", sa.String(length=100), nullable=False),
        sa.Column("weight_unit", sa.String(length=20), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_settings_id"), "settings", ["id"], unique=False)

    op.create_table(
        "admin_security",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("username", sa.String(length=100), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("two_factor_enabled", sa.Boolean(), nullable=False),
        sa.Column("email_verified", sa.Boolean(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_admin_security_email"), "admin_security", ["email"], unique=True)
    op.create_index(op.f("ix_admin_security_id"), "admin_security", ["id"], unique=False)

    op.create_table(
        "payment_methods",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("fee", sa.Numeric(precision=8, scale=2), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_payment_methods_id"), "payment_methods", ["id"], unique=False)
    op.create_index(op.f("ix_payment_methods_name"), "payment_methods", ["name"], unique=True)

    op.create_table(
        "notification_settings",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("event_name", sa.String(length=120), nullable=False),
        sa.Column("email_enabled", sa.Boolean(), nullable=False),
        sa.Column("whatsapp_enabled", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_notification_settings_event_name"), "notification_settings", ["event_name"], unique=True)
    op.create_index(op.f("ix_notification_settings_id"), "notification_settings", ["id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_notification_settings_id"), table_name="notification_settings")
    op.drop_index(op.f("ix_notification_settings_event_name"), table_name="notification_settings")
    op.drop_table("notification_settings")

    op.drop_index(op.f("ix_payment_methods_name"), table_name="payment_methods")
    op.drop_index(op.f("ix_payment_methods_id"), table_name="payment_methods")
    op.drop_table("payment_methods")

    op.drop_index(op.f("ix_admin_security_id"), table_name="admin_security")
    op.drop_index(op.f("ix_admin_security_email"), table_name="admin_security")
    op.drop_table("admin_security")

    op.drop_index(op.f("ix_settings_id"), table_name="settings")
    op.drop_table("settings")
