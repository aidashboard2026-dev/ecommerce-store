"""add auth columns to customers

Revision ID: h1i2j3k4l5m6
Revises: 0000000000ff
Create Date: 2026-06-27 00:00:00.000000

Adds the columns required for the password-reset flow and improved auth
observability. All columns are nullable so this migration is safe to run
against existing data without any backfill.

New columns:
  customers.email_verified          - BOOLEAN, default FALSE
  customers.password_reset_token    - VARCHAR(255), nullable (hashed token)
  customers.password_reset_expires  - TIMESTAMP WITH TIME ZONE, nullable
  customers.last_login_at           - TIMESTAMP WITH TIME ZONE, nullable
  admins.last_login_at              - TIMESTAMP WITH TIME ZONE, nullable
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = 'h1i2j3k4l5m6'
down_revision: Union[str, None] = '0000000000ff'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── customers table ───────────────────────────────────────────────────────
    op.add_column(
        'customers',
        sa.Column('email_verified', sa.Boolean(), nullable=False, server_default='false'),
    )
    op.add_column(
        'customers',
        sa.Column('password_reset_token', sa.String(255), nullable=True),
    )
    op.add_column(
        'customers',
        sa.Column('password_reset_expires', sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        'customers',
        sa.Column('last_login_at', sa.DateTime(timezone=True), nullable=True),
    )

    # Index for fast token lookups during password reset
    op.create_index(
        'ix_customers_password_reset_token',
        'customers',
        ['password_reset_token'],
        unique=True,
    )

    # ── admins table ──────────────────────────────────────────────────────────
    op.add_column(
        'admins',
        sa.Column('last_login_at', sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('admins', 'last_login_at')

    op.drop_index('ix_customers_password_reset_token', table_name='customers')
    op.drop_column('customers', 'last_login_at')
    op.drop_column('customers', 'password_reset_expires')
    op.drop_column('customers', 'password_reset_token')
    op.drop_column('customers', 'email_verified')
