"""categories, collections, and product enhancements

Revision ID: g1h2i3j4k5l6
Revises: 0000000000ff
Create Date: 2026-06-18

Adds:
  - categories table
  - collections table
  - products.category_id (FK → categories.id)
  - products.collection_id (FK → collections.id)
  - products.short_description
  - products.is_trending
  - products.is_best_seller
  - products.is_new_arrival
  - products.view_count
  - products.orders_count
  - products.sales_count
  - products.image_front
  - products.image_back
  - products.image_size_chart
  - products.gallery_images (JSON)
  - product_variants.reserved_stock

Preserves:
  - products.collection  (free-text, kept for backward compat)
  - products.thumbnail   (kept for backward compat)
  - All existing data

Safe on existing DB: all new columns are nullable or have safe defaults.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "g1h2i3j4k5l6"
down_revision = "0000000000ff"
branch_labels = None
depends_on = None


def upgrade() -> None:

    # ─────────────────────────────────────────────────────────
    # CATEGORIES
    # ─────────────────────────────────────────────────────────

    op.create_table(
        "categories",

        sa.Column("id", sa.Integer(), nullable=False),

        sa.Column(
            "name",
            sa.String(length=100),
            nullable=False,
        ),

        sa.Column(
            "slug",
            sa.String(length=120),
            nullable=False,
        ),

        sa.Column(
            "description",
            sa.Text(),
            nullable=True,
        ),

        sa.Column(
            "status",
            sa.String(length=20),
            server_default="active",
            nullable=False,
        ),

        sa.Column(
            "sort_order",
            sa.Integer(),
            server_default="0",
            nullable=False,
        ),

        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),

        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),

        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name", name="uq_categories_name"),
        sa.UniqueConstraint("slug", name="uq_categories_slug"),
    )

    op.create_index(
        op.f("ix_categories_id"),
        "categories",
        ["id"],
        unique=False,
    )

    op.create_index(
        op.f("ix_categories_slug"),
        "categories",
        ["slug"],
        unique=True,
    )

    op.create_index(
        op.f("ix_categories_status"),
        "categories",
        ["status"],
        unique=False,
    )

    # ─────────────────────────────────────────────────────────
    # COLLECTIONS
    # ─────────────────────────────────────────────────────────

    op.create_table(
        "collections",

        sa.Column("id", sa.Integer(), nullable=False),

        sa.Column(
            "category_id",
            sa.Integer(),
            sa.ForeignKey("categories.id", ondelete="SET NULL"),
            nullable=True,
        ),

        sa.Column(
            "name",
            sa.String(length=100),
            nullable=False,
        ),

        sa.Column(
            "slug",
            sa.String(length=120),
            nullable=False,
        ),

        sa.Column(
            "description",
            sa.Text(),
            nullable=True,
        ),

        sa.Column(
            "status",
            sa.String(length=20),
            server_default="active",
            nullable=False,
        ),

        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),

        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),

        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug", name="uq_collections_slug"),
    )

    op.create_index(
        op.f("ix_collections_id"),
        "collections",
        ["id"],
        unique=False,
    )

    op.create_index(
        op.f("ix_collections_category_id"),
        "collections",
        ["category_id"],
        unique=False,
    )

    op.create_index(
        op.f("ix_collections_slug"),
        "collections",
        ["slug"],
        unique=True,
    )

    # ─────────────────────────────────────────────────────────
    # PRODUCTS — new columns
    # ─────────────────────────────────────────────────────────

    # FK references — nullable so existing products are unaffected
    op.add_column(
        "products",
        sa.Column(
            "category_id",
            sa.Integer(),
            sa.ForeignKey("categories.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )

    op.add_column(
        "products",
        sa.Column(
            "collection_id",
            sa.Integer(),
            sa.ForeignKey("collections.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )

    # Short marketing description (card teaser, storefront listing)
    op.add_column(
        "products",
        sa.Column(
            "short_description",
            sa.String(length=500),
            nullable=True,
        ),
    )

    # Marketing / merchandising flags
    op.add_column(
        "products",
        sa.Column(
            "is_trending",
            sa.Boolean(),
            server_default=sa.text("false"),
            nullable=False,
        ),
    )

    op.add_column(
        "products",
        sa.Column(
            "is_best_seller",
            sa.Boolean(),
            server_default=sa.text("false"),
            nullable=False,
        ),
    )

    op.add_column(
        "products",
        sa.Column(
            "is_new_arrival",
            sa.Boolean(),
            server_default=sa.text("false"),
            nullable=False,
        ),
    )

    # Analytics counters (updated by order/view events)
    op.add_column(
        "products",
        sa.Column(
            "view_count",
            sa.Integer(),
            server_default="0",
            nullable=False,
        ),
    )

    op.add_column(
        "products",
        sa.Column(
            "orders_count",
            sa.Integer(),
            server_default="0",
            nullable=False,
        ),
    )

    op.add_column(
        "products",
        sa.Column(
            "sales_count",
            sa.Integer(),
            server_default="0",
            nullable=False,
        ),
    )

    # Extended image fields (thumbnail kept for backward compat)
    op.add_column(
        "products",
        sa.Column(
            "image_front",
            sa.String(length=500),
            nullable=True,
        ),
    )

    op.add_column(
        "products",
        sa.Column(
            "image_back",
            sa.String(length=500),
            nullable=True,
        ),
    )

    op.add_column(
        "products",
        sa.Column(
            "image_size_chart",
            sa.String(length=500),
            nullable=True,
        ),
    )

    op.add_column(
        "products",
        sa.Column(
            "gallery_images",
            postgresql.JSON(astext_type=sa.Text()),
            server_default="[]",
            nullable=True,
        ),
    )

    # Indexes for the new FK columns
    op.create_index(
        op.f("ix_products_category_id"),
        "products",
        ["category_id"],
        unique=False,
    )

    op.create_index(
        op.f("ix_products_collection_id"),
        "products",
        ["collection_id"],
        unique=False,
    )

    op.create_index(
        op.f("ix_products_is_trending"),
        "products",
        ["is_trending"],
        unique=False,
    )

    op.create_index(
        op.f("ix_products_is_best_seller"),
        "products",
        ["is_best_seller"],
        unique=False,
    )

    op.create_index(
        op.f("ix_products_is_new_arrival"),
        "products",
        ["is_new_arrival"],
        unique=False,
    )

    # ─────────────────────────────────────────────────────────
    # PRODUCT VARIANTS — reserved_stock for inventory accuracy
    # ─────────────────────────────────────────────────────────

    op.add_column(
        "product_variants",
        sa.Column(
            "reserved_stock",
            sa.Integer(),
            server_default="0",
            nullable=False,
        ),
    )


def downgrade() -> None:

    # Variants
    op.drop_column("product_variants", "reserved_stock")

    # Products
    op.drop_index(op.f("ix_products_is_new_arrival"), table_name="products")
    op.drop_index(op.f("ix_products_is_best_seller"), table_name="products")
    op.drop_index(op.f("ix_products_is_trending"), table_name="products")
    op.drop_index(op.f("ix_products_collection_id"), table_name="products")
    op.drop_index(op.f("ix_products_category_id"), table_name="products")

    op.drop_column("products", "gallery_images")
    op.drop_column("products", "image_size_chart")
    op.drop_column("products", "image_back")
    op.drop_column("products", "image_front")
    op.drop_column("products", "sales_count")
    op.drop_column("products", "orders_count")
    op.drop_column("products", "view_count")
    op.drop_column("products", "is_new_arrival")
    op.drop_column("products", "is_best_seller")
    op.drop_column("products", "is_trending")
    op.drop_column("products", "short_description")
    op.drop_column("products", "collection_id")
    op.drop_column("products", "category_id")

    # Collections
    op.drop_index(op.f("ix_collections_slug"), table_name="collections")
    op.drop_index(op.f("ix_collections_category_id"), table_name="collections")
    op.drop_index(op.f("ix_collections_id"), table_name="collections")
    op.drop_table("collections")

    # Categories
    op.drop_index(op.f("ix_categories_status"), table_name="categories")
    op.drop_index(op.f("ix_categories_slug"), table_name="categories")
    op.drop_index(op.f("ix_categories_id"), table_name="categories")
    op.drop_table("categories")