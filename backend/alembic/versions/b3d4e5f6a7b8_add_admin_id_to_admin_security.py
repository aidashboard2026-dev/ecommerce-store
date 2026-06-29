"""add admin_id to admin_security and link to admins

Revision ID: b3d4e5f6a7b8
Revises: f1a2b3c4d5e6
Create Date: 2026-06-28 23:30:00

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'b3d4e5f6a7b8'
down_revision = 'f1a2b3c4d5e6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Add admin_id column as nullable
    op.add_column('admin_security', sa.Column('admin_id', sa.Integer(), nullable=True))

    # 2. Populate admin_id by matching emails
    op.execute("""
        UPDATE admin_security
        SET admin_id = admins.id
        FROM admins
        WHERE admin_security.email = admins.email
    """)

    # 3. Fallback for any orphan rows: bind to first admin if any exists
    op.execute("""
        UPDATE admin_security
        SET admin_id = (SELECT id FROM admins LIMIT 1)
        WHERE admin_id IS NULL AND EXISTS (SELECT 1 FROM admins)
    """)

    # 4. Delete any remaining rows that couldn't be associated
    op.execute("DELETE FROM admin_security WHERE admin_id IS NULL")

    # 5. Make admin_id NOT NULL
    op.alter_column('admin_security', 'admin_id', nullable=False)

    # 6. Add unique constraint and foreign key
    op.create_unique_constraint('uq_admin_security_admin_id', 'admin_security', ['admin_id'])
    op.create_foreign_key(
        'fk_admin_security_admin_id',
        'admin_security', 'admins',
        ['admin_id'], ['id'],
        ondelete='CASCADE'
    )


def downgrade() -> None:
    op.drop_constraint('fk_admin_security_admin_id', 'admin_security', type_='foreignkey')
    op.drop_constraint('uq_admin_security_admin_id', 'admin_security', type_='unique')
    op.drop_column('admin_security', 'admin_id')
