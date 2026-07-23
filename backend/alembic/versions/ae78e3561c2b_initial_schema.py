"""initial schema

Revision ID: ae78e3561c2b
Revises:
Create Date: 2026-06-08 09:33:26.194392
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = "ae78e3561c2b"
down_revision = None
branch_labels = None
depends_on = None


# Shared PostgreSQL ENUM object.
# IMPORTANT:
# This MUST be reused inside create_table().
# Inline Enum(...) definitions trigger CREATE TYPE again internally.
product_status_enum = postgresql.ENUM(
    "draft",
    "published",
    "archived",
    name="product_status_enum",
    create_type=False,
)


def upgrade() -> None:

    # ─────────────────────────────────────────────────────────
    # Create ENUM safely
    # ─────────────────────────────────────────────────────────

    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM pg_type
                WHERE typname = 'product_status_enum'
            ) THEN
                CREATE TYPE product_status_enum AS ENUM (
                    'draft',
                    'published',
                    'archived'
                );
            END IF;
        END$$;
        """
    )

    # ─────────────────────────────────────────────────────────
    # ADMINS
    # ─────────────────────────────────────────────────────────

    op.create_table(
        "admins",

        sa.Column("id", sa.Integer(), nullable=False),

        sa.Column(
            "name",
            sa.String(length=100),
            nullable=False,
        ),

        sa.Column(
            "email",
            sa.String(length=255),
            nullable=False,
        ),

        sa.Column(
            "password_hash",
            sa.String(length=255),
            nullable=False,
        ),

        sa.Column(
            "role",
            sa.String(length=50),
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
            nullable=True,
        ),

        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(
        op.f("ix_admins_email"),
        "admins",
        ["email"],
        unique=True,
    )

    op.create_index(
        op.f("ix_admins_id"),
        "admins",
        ["id"],
        unique=False,
    )

    # ─────────────────────────────────────────────────────────
    # ORDERS
    # ─────────────────────────────────────────────────────────

    op.create_table(
        "orders",

        sa.Column("id", sa.Integer(), nullable=False),

        sa.Column(
            "order_number",
            sa.String(length=32),
            nullable=False,
        ),

        sa.Column(
            "customer",
            sa.String(length=100),
            nullable=False,
        ),

        sa.Column(
            "items",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "total",
            sa.Numeric(precision=12, scale=2),
            nullable=False,
        ),

        sa.Column(
            "status",
            sa.String(length=50),
            nullable=False,
        ),

        sa.Column(
            "payment",
            sa.String(length=50),
            nullable=False,
        ),

        sa.Column(
            "ordered_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
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
            nullable=True,
        ),

        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(
        op.f("ix_orders_id"),
        "orders",
        ["id"],
        unique=False,
    )

    op.create_index(
        op.f("ix_orders_order_number"),
        "orders",
        ["order_number"],
        unique=True,
    )

    # ─────────────────────────────────────────────────────────
    # PRODUCTS
    # ─────────────────────────────────────────────────────────

    op.create_table(
        "products",

        sa.Column("id", sa.Integer(), nullable=False),

        sa.Column(
            "title",
            sa.String(length=255),
            nullable=False,
        ),

        # IMPORTANT:
        # NOT globally unique.
        # Soft-delete-safe uniqueness enforced by partial index below.
        sa.Column(
            "slug",
            sa.String(length=255),
            nullable=False,
        ),

        sa.Column(
            "description",
            sa.Text(),
            nullable=True,
        ),

        sa.Column(
            "collection",
            sa.String(length=255),
            nullable=True,
        ),

        sa.Column(
            "tags",
            sa.JSON(),
            nullable=False,
        ),

        # IMPORTANT FIX:
        # Reuse shared ENUM object.
        # DO NOT use inline sa.Enum(...) here.
        sa.Column(
            "status",
            product_status_enum,
            nullable=False,
        ),

        sa.Column(
            "is_featured",
            sa.Boolean(),
            nullable=False,
        ),

        sa.Column(
            "thumbnail",
            sa.String(length=500),
            nullable=True,
        ),

        sa.Column(
            "seo_title",
            sa.String(length=255),
            nullable=True,
        ),

        sa.Column(
            "seo_description",
            sa.Text(),
            nullable=True,
        ),

        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),

        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),

        sa.Column(
            "deleted_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),

        sa.PrimaryKeyConstraint("id"),
    )

    # Product indexes

    op.create_index(
        op.f("ix_products_collection"),
        "products",
        ["collection"],
    )

    op.create_index(
        op.f("ix_products_created_at"),
        "products",
        ["created_at"],
    )

    op.create_index(
        op.f("ix_products_deleted_at"),
        "products",
        ["deleted_at"],
    )

    op.create_index(
        op.f("ix_products_id"),
        "products",
        ["id"],
    )

    op.create_index(
        op.f("ix_products_is_featured"),
        "products",
        ["is_featured"],
    )

    op.create_index(
        op.f("ix_products_status"),
        "products",
        ["status"],
    )

    op.create_index(
        op.f("ix_products_slug"),
        "products",
        ["slug"],
        unique=False,
    )

    op.create_index(
        "ix_products_deleted_status_created",
        "products",
        ["deleted_at", "status", "created_at"],
    )

    # Soft-delete-safe slug uniqueness
    op.execute(
        """
        CREATE UNIQUE INDEX uq_products_slug_active
        ON products (slug)
        WHERE deleted_at IS NULL;
        """
    )

    # ─────────────────────────────────────────────────────────
    # PRODUCT VARIANTS
    # ─────────────────────────────────────────────────────────

    op.create_table(
        "product_variants",

        sa.Column("id", sa.Integer(), nullable=False),

        sa.Column(
            "product_id",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "sku",
            sa.String(length=120),
            nullable=False,
        ),

        sa.Column(
            "size",
            sa.String(length=50),
            nullable=False,
        ),

        sa.Column(
            "color",
            sa.String(length=50),
            nullable=True,
        ),

        sa.Column(
            "color_hex",
            sa.String(length=7),
            nullable=True,
        ),

        sa.Column(
            "original_price",
            sa.Numeric(precision=10, scale=2),
            nullable=False,
        ),

        sa.Column(
            "selling_price",
            sa.Numeric(precision=10, scale=2),
            nullable=False,
        ),

        sa.Column(
            "discount_percentage",
            sa.Numeric(precision=5, scale=2),
            nullable=False,
        ),

        sa.Column(
            "stock_quantity",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "low_stock_threshold",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),

        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),

        sa.CheckConstraint(
            "original_price > 0",
            name="ck_variant_orig_price_pos",
        ),

        sa.CheckConstraint(
            "selling_price <= original_price",
            name="ck_variant_sell_lte_orig",
        ),

        sa.CheckConstraint(
            "selling_price > 0",
            name="ck_variant_sell_price_pos",
        ),

        sa.CheckConstraint(
            "stock_quantity >= 0",
            name="ck_variant_stock_nonneg",
        ),

        sa.ForeignKeyConstraint(
            ["product_id"],
            ["products.id"],
            ondelete="CASCADE",
        ),

        sa.PrimaryKeyConstraint("id"),

        sa.UniqueConstraint(
            "product_id",
            "size",
            "color",
            name="uq_variant_product_size_color",
        ),
    )

    op.create_index(
        op.f("ix_product_variants_color"),
        "product_variants",
        ["color"],
    )

    op.create_index(
        op.f("ix_product_variants_id"),
        "product_variants",
        ["id"],
    )

    op.create_index(
        op.f("ix_product_variants_product_id"),
        "product_variants",
        ["product_id"],
    )

    op.create_index(
        op.f("ix_product_variants_size"),
        "product_variants",
        ["size"],
    )

    op.create_index(
        op.f("ix_product_variants_sku"),
        "product_variants",
        ["sku"],
        unique=True,
    )

    op.create_index(
        op.f("ix_product_variants_stock_quantity"),
        "product_variants",
        ["stock_quantity"],
    )

    op.create_index(
        "ix_variant_product_stock",
        "product_variants",
        ["product_id", "stock_quantity"],
    )


def downgrade() -> None:

    # ─────────────────────────────────────────────────────────
    # PRODUCT VARIANTS
    # ─────────────────────────────────────────────────────────

    op.drop_index(
        "ix_variant_product_stock",
        table_name="product_variants",
    )

    op.drop_index(
        op.f("ix_product_variants_stock_quantity"),
        table_name="product_variants",
    )

    op.drop_index(
        op.f("ix_product_variants_sku"),
        table_name="product_variants",
    )

    op.drop_index(
        op.f("ix_product_variants_size"),
        table_name="product_variants",
    )

    op.drop_index(
        op.f("ix_product_variants_product_id"),
        table_name="product_variants",
    )

    op.drop_index(
        op.f("ix_product_variants_id"),
        table_name="product_variants",
    )

    op.drop_index(
        op.f("ix_product_variants_color"),
        table_name="product_variants",
    )

    op.drop_table("product_variants")

    # ─────────────────────────────────────────────────────────
    # PRODUCTS
    # ─────────────────────────────────────────────────────────

    op.execute(
        "DROP INDEX IF EXISTS uq_products_slug_active"
    )

    op.drop_index(
        "ix_products_deleted_status_created",
        table_name="products",
    )

    op.drop_index(
        op.f("ix_products_slug"),
        table_name="products",
    )

    op.drop_index(
        op.f("ix_products_status"),
        table_name="products",
    )

    op.drop_index(
        op.f("ix_products_is_featured"),
        table_name="products",
    )

    op.drop_index(
        op.f("ix_products_id"),
        table_name="products",
    )

    op.drop_index(
        op.f("ix_products_deleted_at"),
        table_name="products",
    )

    op.drop_index(
        op.f("ix_products_created_at"),
        table_name="products",
    )

    op.drop_index(
        op.f("ix_products_collection"),
        table_name="products",
    )

    op.drop_table("products")

    # ─────────────────────────────────────────────────────────
    # ORDERS
    # ─────────────────────────────────────────────────────────

    op.drop_index(
        op.f("ix_orders_order_number"),
        table_name="orders",
    )

    op.drop_index(
        op.f("ix_orders_id"),
        table_name="orders",
    )

    op.drop_table("orders")

    # ─────────────────────────────────────────────────────────
    # ADMINS
    # ─────────────────────────────────────────────────────────

    op.drop_index(
        op.f("ix_admins_id"),
        table_name="admins",
    )

    op.drop_index(
        op.f("ix_admins_email"),
        table_name="admins",
    )

    op.drop_table("admins")

    # ─────────────────────────────────────────────────────────
    # ENUM
    # ─────────────────────────────────────────────────────────

    op.execute(
        "DROP TYPE IF EXISTS product_status_enum"
    )

