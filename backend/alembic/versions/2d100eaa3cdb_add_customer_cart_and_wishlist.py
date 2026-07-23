"""add customer cart and wishlist

Revision ID: 2d100eaa3cdb
Revises: create_admin_notifications
Create Date: 2026-07-12 02:17:30.826483
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "2d100eaa3cdb"

down_revision: Union[str, None] = (
    "create_admin_notifications"
)

branch_labels: Union[
    str,
    Sequence[str],
    None,
] = None

depends_on: Union[
    str,
    Sequence[str],
    None,
] = None


def upgrade() -> None:

    # ==================================================
    # Customer Cart Items
    # ==================================================

    op.create_table(
        "customer_cart_items",

        sa.Column(
            "id",
            sa.Integer(),
            primary_key=True,
            nullable=False,
        ),

        sa.Column(
            "customer_id",
            sa.Integer(),
            sa.ForeignKey(
                "customers.id",
                ondelete="CASCADE",
            ),
            nullable=False,
        ),

        sa.Column(
            "product_id",
            sa.Integer(),
            sa.ForeignKey(
                "products.id",
                ondelete="CASCADE",
            ),
            nullable=False,
        ),

        sa.Column(
            "variant_id",
            sa.Integer(),
            sa.ForeignKey(
                "product_variants.id",
                ondelete="SET NULL",
            ),
            nullable=True,
        ),

        sa.Column(
            "quantity",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("1"),
        ),

        sa.Column(
            "created_at",
            sa.DateTime(
                timezone=True
            ),
            nullable=False,
            server_default=sa.func.now(),
        ),

        sa.Column(
            "updated_at",
            sa.DateTime(
                timezone=True
            ),
            nullable=False,
            server_default=sa.func.now(),
        ),

        sa.CheckConstraint(
            "quantity > 0",
            name=(
                "ck_customer_cart_"
                "quantity_positive"
            ),
        ),
    )

    # Customer cart lookup index

    op.create_index(
        "ix_customer_cart_items_customer_id",
        "customer_cart_items",
        [
            "customer_id",
        ],
        unique=False,
    )

    # Product lookup index

    op.create_index(
        "ix_customer_cart_items_product_id",
        "customer_cart_items",
        [
            "product_id",
        ],
        unique=False,
    )

    # Prevent the same product + variant
    # from being duplicated in one account.

    op.create_unique_constraint(
        "uq_customer_cart_product_variant",
        "customer_cart_items",
        [
            "customer_id",
            "product_id",
            "variant_id",
        ],
    )


    # ==================================================
    # Customer Wishlist Items
    # ==================================================

    op.create_table(
        "customer_wishlist_items",

        sa.Column(
            "id",
            sa.Integer(),
            primary_key=True,
            nullable=False,
        ),

        sa.Column(
            "customer_id",
            sa.Integer(),
            sa.ForeignKey(
                "customers.id",
                ondelete="CASCADE",
            ),
            nullable=False,
        ),

        sa.Column(
            "product_id",
            sa.Integer(),
            sa.ForeignKey(
                "products.id",
                ondelete="CASCADE",
            ),
            nullable=False,
        ),

        sa.Column(
            "created_at",
            sa.DateTime(
                timezone=True
            ),
            nullable=False,
            server_default=sa.func.now(),
        ),

        sa.UniqueConstraint(
            "customer_id",
            "product_id",
            name=(
                "uq_customer_wishlist_"
                "customer_product"
            ),
        ),
    )

    # Customer wishlist lookup index

    op.create_index(
        (
            "ix_customer_wishlist_"
            "items_customer_id"
        ),
        "customer_wishlist_items",
        [
            "customer_id",
        ],
        unique=False,
    )


def downgrade() -> None:

    # ==================================================
    # Remove Wishlist
    # ==================================================

    op.drop_index(
        (
            "ix_customer_wishlist_"
            "items_customer_id"
        ),
        table_name=(
            "customer_wishlist_items"
        ),
    )

    op.drop_table(
        "customer_wishlist_items"
    )


    # ==================================================
    # Remove Cart
    # ==================================================

    op.drop_constraint(
        "uq_customer_cart_product_variant",
        "customer_cart_items",
        type_="unique",
    )

    op.drop_index(
        "ix_customer_cart_items_product_id",
        table_name=(
            "customer_cart_items"
        ),
    )

    op.drop_index(
        "ix_customer_cart_items_customer_id",
        table_name=(
            "customer_cart_items"
        ),
    )

    op.drop_table(
        "customer_cart_items"
    )