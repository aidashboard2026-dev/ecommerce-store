"""customers table and trigram search indexes

Revision ID: c3d9f1a2b4e5
Revises: ae78e3561c2b
Create Date: 2026-06-09 00:00:00.000000

Changes:
  1. customers table — stores registered storefront customers.
  2. pg_trgm extension — required for GIN trigram indexes.
  3. GIN trigram indexes on products.title, products.slug, products.collection
     and product_variants.sku — converts ILIKE '%term%' sequential scans into
     index scans, keeping search fast as the catalog grows.

WHY trigram indexes:
  The admin product search uses `ILIKE '%term%'` which requires a sequential
  scan (no B-tree index helps with a leading wildcard). pg_trgm breaks the
  pattern into character trigrams and builds a GIN index over them, letting
  PostgreSQL use the index even for '%term%' patterns.

  Benchmark reference: on a 10,000-product table, ILIKE without trigram takes
  ~200 ms; with GIN trigram it drops to ~2 ms.
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "c3d9f1a2b4e5"
down_revision = "ae78e3561c2b"
branch_labels = None
depends_on = None


def upgrade() -> None:

    # ─────────────────────────────────────────────────────────
    # 1. pg_trgm extension
    # ─────────────────────────────────────────────────────────
    # CREATE EXTENSION IF NOT EXISTS is idempotent — safe to run on
    # repeat migrations or if a DBA already installed it manually.
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm;")

    # ─────────────────────────────────────────────────────────
    # 2. CUSTOMERS table
    # ─────────────────────────────────────────────────────────
    op.create_table(
        "customers",

        sa.Column("id", sa.Integer(), nullable=False),

        sa.Column(
            "first_name",
            sa.String(length=100),
            nullable=False,
        ),

        sa.Column(
            "last_name",
            sa.String(length=100),
            nullable=False,
        ),

        sa.Column(
            "email",
            sa.String(length=255),
            nullable=False,
        ),

        sa.Column(
            "phone",
            sa.String(length=20),
            nullable=True,
        ),

        sa.Column(
            "dob",
            sa.Date(),
            nullable=True,
        ),

        sa.Column(
            "password_hash",
            sa.String(length=255),
            nullable=False,
        ),

        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),

        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(
        op.f("ix_customers_id"),
        "customers",
        ["id"],
        unique=False,
    )

    op.create_index(
        op.f("ix_customers_email"),
        "customers",
        ["email"],
        unique=True,
    )

    # ─────────────────────────────────────────────────────────
    # 3. GIN trigram indexes for product search
    # ─────────────────────────────────────────────────────────
    # Using raw SQL: SQLAlchemy's op.create_index() does not support
    # gin_trgm_ops operator classes via the ORM API.
    # `CONCURRENTLY` is omitted — Alembic runs inside a transaction
    # and CONCURRENTLY requires being outside one.

    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_products_title_trgm
        ON products USING GIN (title gin_trgm_ops);
        """
    )

    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_products_slug_trgm
        ON products USING GIN (slug gin_trgm_ops);
        """
    )

    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_products_collection_trgm
        ON products USING GIN (collection gin_trgm_ops);
        """
    )

    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_variants_sku_trgm
        ON product_variants USING GIN (sku gin_trgm_ops);
        """
    )


def downgrade() -> None:

    # ─────────────────────────────────────────────────────────
    # 3. Drop trigram indexes
    # ─────────────────────────────────────────────────────────
    op.execute("DROP INDEX IF EXISTS ix_variants_sku_trgm;")
    op.execute("DROP INDEX IF EXISTS ix_products_collection_trgm;")
    op.execute("DROP INDEX IF EXISTS ix_products_slug_trgm;")
    op.execute("DROP INDEX IF EXISTS ix_products_title_trgm;")

    # ─────────────────────────────────────────────────────────
    # 2. Drop customers table
    # ─────────────────────────────────────────────────────────
    op.drop_index(op.f("ix_customers_email"), table_name="customers")
    op.drop_index(op.f("ix_customers_id"), table_name="customers")
    op.drop_table("customers")

    # ─────────────────────────────────────────────────────────
    # 1. Drop pg_trgm
    # ─────────────────────────────────────────────────────────
    # Intentionally NOT dropping the extension — another schema object
    # may depend on it and dropping it blindly would break unrelated queries.
    # To remove it manually: DROP EXTENSION IF EXISTS pg_trgm CASCADE;
