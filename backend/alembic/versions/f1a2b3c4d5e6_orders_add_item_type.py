
from alembic import op


revision = "f1a2b3c4d5e6"
down_revision = "dcbb7b5a066f"
branch_labels = None
depends_on = None


def upgrade() -> None:

    # ADD COLUMN — nullable, no default, safe on populated tables
    op.execute("""
        ALTER TABLE orders
        ADD COLUMN IF NOT EXISTS item_type VARCHAR(20)
    """)

    # Index for admin panel filtering by item type
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_orders_item_type
        ON orders (item_type)
    """)


def downgrade() -> None:

    op.execute("DROP INDEX IF EXISTS ix_orders_item_type")

    op.execute("""
        ALTER TABLE orders
        DROP COLUMN IF EXISTS item_type
    """)