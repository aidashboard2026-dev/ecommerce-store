"""
app/modules/orders/repository.py

Order repository — the ONLY layer that communicates with SQLAlchemy for orders.

Products module is imported here because Orders is the shared domain that
coordinates between Products and Custom Products via item_type. This is the
correct architectural boundary — the router and service never import product
models directly.

All methods raise domain exceptions (NotFoundError, BusinessRuleError) —
never HTTPException.
"""

from __future__ import annotations

import logging
import math
from datetime import datetime, timezone
from typing import List, Optional, Tuple

from sqlalchemy import func as sqla_func
from sqlalchemy.orm import Session

from app.modules.orders.models import Order
from app.modules.orders.constants import ItemType, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE
from app.modules.products.models import Product, ProductVariant
from app.shared.exceptions import NotFoundError
from app.shared.repositories import BaseRepository

logger = logging.getLogger(__name__)


class OrderRepository(BaseRepository[Order]):
    """
    Repository for the Order model.

    Inherits generic CRUD from BaseRepository and adds order-specific queries.
    """

    def __init__(self, db: Session) -> None:
        super().__init__(Order, db)

    # ─────────────────────────────────────────────────────────
    # Read
    # ─────────────────────────────────────────────────────────

    def get_order_or_raise(self, order_id: int) -> Order:
        """Fetch an order by PK. Raises NotFoundError if missing."""
        order = self.get_by_id(order_id)
        if order is None:
            raise NotFoundError(f"Order {order_id} not found.", code="ORDER_NOT_FOUND")
        return order

    def get_by_order_number(self, order_number: str) -> Optional[Order]:
        """Fetch an order by its human-readable order number."""
        return (
            self.db.query(Order)
            .filter(Order.order_number == order_number)
            .first()
        )

    def order_number_exists(self, order_number: str) -> bool:
        """Return True if the order number is already taken."""
        return (
            self.db.query(Order.id)
            .filter(Order.order_number == order_number)
            .first()
        ) is not None

    def get_by_customer_email(self, email: str) -> List[Order]:
        """Return all orders for a customer, newest first."""
        return (
            self.db.query(Order)
            .filter(Order.customer_email == email)
            .order_by(Order.ordered_at.desc(), Order.id.desc())
            .all()
        )

    def get_customer_order_or_raise(self, order_id: int, customer_email: str) -> Order:
        """
        Fetch an order by PK, asserting it belongs to the given customer.
        Raises NotFoundError if missing; NotFoundError (masked 403) if wrong owner.

        We deliberately raise NotFoundError rather than a 403 to avoid leaking
        whether the order exists to other customers.
        """
        order = self.get_order_or_raise(order_id)
        if order.customer_email != customer_email:
            # Return the same 404 to avoid enumeration attacks
            raise NotFoundError(f"Order {order_id} not found.", code="ORDER_NOT_FOUND")
        return order

    def list_paginated(
        self,
        *,
        page: int = 1,
        per_page: int = DEFAULT_PAGE_SIZE,
        customer_email: Optional[str] = None,
        tracking_status: Optional[str] = None,
        payment_status: Optional[str] = None,
        item_type: Optional[str] = None,
        search: Optional[str] = None,
    ) -> Tuple[List[Order], int]:
        """
        Return (orders, total_count) with optional filters.
        Used by both the admin list and customer order history.

        Returns a tuple so the caller can build the paginated response schema.
        """
        per_page = min(max(per_page, 1), MAX_PAGE_SIZE)

        q = self.db.query(Order)

        if customer_email:
            q = q.filter(Order.customer_email == customer_email)
        if tracking_status:
            q = q.filter(Order.tracking_status == tracking_status.upper())
        if payment_status:
            q = q.filter(Order.payment_status == payment_status.upper())
        if item_type:
            q = q.filter(Order.item_type == item_type.upper())
        if search:
            term = f"%{search.strip()}%"
            q = q.filter(
                Order.order_number.ilike(term)
                | Order.customer_name.ilike(term)
                | Order.customer_email.ilike(term)
                | Order.product_name.ilike(term)
            )

        total = q.with_entities(sqla_func.count(Order.id)).scalar() or 0
        orders = (
            q.order_by(Order.ordered_at.desc(), Order.id.desc())
            .offset((page - 1) * per_page)
            .limit(per_page)
            .all()
        )
        return orders, total

    # ─────────────────────────────────────────────────────────
    # Inventory — Products integration
    #
    # The Orders domain is the shared system that coordinates with Products.
    # Product/ProductVariant imports live HERE (repository), never in the
    # router and never in the service. The service calls these methods and
    # receives domain objects — it never touches SQLAlchemy directly.
    # ─────────────────────────────────────────────────────────

    def lock_variant_for_order(
        self,
        *,
        product_id: Optional[int],
        product_name: Optional[str],
        size: str,
        color: Optional[str],
    ) -> Optional[ProductVariant]:
        """
        Find and row-lock the ProductVariant matching the order inputs.
        Uses SELECT ... FOR UPDATE to prevent concurrent over-selling.

        Returns None if no matching variant is found (non-fatal — orders for
        custom products or legacy data without variants proceed without stock
        management).

        Only called when item_type == ItemType.PRODUCT.
        """
        if not size:
            return None

        q = (
            self.db.query(ProductVariant)
            .join(Product, Product.id == ProductVariant.product_id)
            .filter(
                ProductVariant.size == size,
                Product.deleted_at.is_(None),
            )
            .with_for_update()
        )

        # Prefer product_id (reliable FK); fall back to title match (legacy path)
        if product_id:
            q = q.filter(Product.id == product_id)
        elif product_name:
            q = q.filter(Product.title == product_name)
        else:
            return None

        if color:
            q = q.filter(ProductVariant.color == color)

        return q.first()

    def find_variant_for_order(self, order: Order) -> Optional[ProductVariant]:
        """
        Find the ProductVariant that was decremented when `order` was placed.
        Used by cancellation / inventory restore logic.

        Mirrors lock_variant_for_order but WITHOUT FOR UPDATE (restore path
        does not need a lock since it increments rather than gatekeeping).
        """
        if not order.size:
            return None

        # Only product orders carry inventory
        if order.item_type not in (None, ItemType.PRODUCT):
            return None

        q = (
            self.db.query(ProductVariant)
            .join(Product, Product.id == ProductVariant.product_id)
            .filter(
                ProductVariant.size == order.size,
                Product.deleted_at.is_(None),
            )
        )
        if order.product_id:
            q = q.filter(Product.id == order.product_id)
        elif order.product_name:
            q = q.filter(Product.title == order.product_name)
        else:
            return None

        if order.color:
            q = q.filter(ProductVariant.color == order.color)

        return q.first()

    # ─────────────────────────────────────────────────────────
    # Write
    # ─────────────────────────────────────────────────────────

    def create_order(self, order: Order) -> Order:
        """Persist a new order. Caller commits the transaction."""
        self.db.add(order)
        self.db.flush()
        return order

    def update_order_fields(self, order: Order, updates: dict) -> Order:
        """Apply field updates to an order. Caller commits."""
        for field, value in updates.items():
            setattr(order, field, value)
        self.db.flush()
        return order

    def decrement_stock(self, variant: ProductVariant, quantity: int) -> None:
        """Decrement variant stock. Must be called inside a locked transaction."""
        variant.stock_quantity -= quantity
        self.db.flush()

    def restore_stock(self, variant: ProductVariant, quantity: int) -> None:
        """Restore variant stock on cancellation."""
        variant.stock_quantity += quantity
        self.db.flush()

    # ─────────────────────────────────────────────────────────
    # Order number generation
    # ─────────────────────────────────────────────────────────

    def generate_order_number(self) -> str:
        """
        Generate a unique order number in the format ORD-YYYYMMDDHHMMSS[-N].

        Collision-safe: if the timestamp prefix is already taken (concurrent
        requests within the same second), appends an incrementing suffix.
        """
        prefix    = datetime.now(timezone.utc).strftime("ORD-%Y%m%d%H%M%S")
        candidate = prefix
        suffix    = 1

        while self.order_number_exists(candidate):
            suffix   += 1
            candidate = f"{prefix}-{suffix}"

        return candidate
