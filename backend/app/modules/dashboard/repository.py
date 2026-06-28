"""
app/modules/dashboard/repository.py

Dashboard analytics repository — all SQLAlchemy lives here.

This is a read-only cross-domain repository. It does not extend BaseRepository
because it queries across multiple tables rather than owning a single model.
All methods are read-only (SELECT only) — the dashboard never writes data.

IMPORTS NOTE
------------
The dashboard is an analytics / reporting domain that intentionally reads
across Products, Orders, and Admins. These imports are correct and expected
here — the repository is the right layer for cross-domain reads.
"""

from __future__ import annotations

from calendar import month_abbr
from datetime import date, datetime, time, timezone
from decimal import Decimal
from typing import Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.modules.admins.models import Admin
from app.modules.orders.models import Order
from app.modules.products.models import Category, Product, ProductVariant
from app.modules.dashboard.constants import (
    ACTIVE_SALES_STATUSES,
    CASH_PAYMENT_METHODS,
    GROWTH_WINDOW_DAYS,
    LOW_STOCK_LIMIT,
    RECENT_ACTIVITY_LIMIT,
    RECENT_ORDERS_LIMIT,
    RECENT_PRODUCTS_LIMIT,
    REVENUE_PAYMENT,
    REVENUE_STATUS,
    TOP_CATEGORIES_LIMIT,
    UPI_PAYMENT_METHODS,
    WEEKDAY_LABELS,
)


class DashboardRepository:
    """
    Read-only analytics repository.
    All methods return plain Python primitives or dicts — never ORM objects
    that the service layer would need to know the schema of.
    """

    def __init__(self, db: Session) -> None:
        self.db = db

    # ── Internal filters ──────────────────────────────────────────────────────

    def _revenue_filters(self):
        """Filters that define a 'realised revenue' order."""
        return (
            func.lower(Order.tracking_status) == REVENUE_STATUS,
            func.lower(Order.payment_status)  == REVENUE_PAYMENT,
        )

    def _active_order_filters(self):
        """Filters that define an 'active sale' order."""
        return (
            func.lower(Order.tracking_status).in_(ACTIVE_SALES_STATUSES),
        )

    # ── Scalar counts ─────────────────────────────────────────────────────────

    def total_active_order_count(self) -> int:
        return (
            self.db.query(func.count(Order.id))
            .filter(*self._active_order_filters())
            .scalar() or 0
        )

    def total_revenue(self) -> float:
        result = (
            self.db.query(func.coalesce(func.sum(Order.total_amount), 0))
            .filter(*self._revenue_filters())
            .scalar()
        )
        return float(result or 0)

    def admin_count(self) -> int:
        return self.db.query(func.count(Admin.id)).scalar() or 0

    def product_count(self, published_only: bool = False) -> int:
        q = self.db.query(func.count(Product.id)).filter(Product.deleted_at.is_(None))
        if published_only:
            q = q.filter(Product.status == "published")
        return q.scalar() or 0

    # ── Windowed counts (for growth %) ───────────────────────────────────────

    def revenue_in_window(
        self,
        start_at: datetime,
        end_at:   datetime,
    ) -> float:
        result = (
            self.db.query(func.coalesce(func.sum(Order.total_amount), 0))
            .filter(
                *self._revenue_filters(),
                Order.ordered_at >= start_at,
                Order.ordered_at <  end_at,
            )
            .scalar()
        )
        return float(result or 0)

    def admin_count_in_window(self, start_at: datetime, end_at: datetime) -> int:
        return (
            self.db.query(func.count(Admin.id))
            .filter(Admin.created_at >= start_at, Admin.created_at < end_at)
            .scalar() or 0
        )

    def product_count_in_window(self, start_at: datetime, end_at: datetime) -> int:
        return (
            self.db.query(func.count(Product.id))
            .filter(
                Product.deleted_at.is_(None),
                Product.created_at >= start_at,
                Product.created_at <  end_at,
            )
            .scalar() or 0
        )

    # ── Payment method revenue breakdown ─────────────────────────────────────

    def payment_revenue_summary(
        self,
        payment_methods: tuple,
        start_at: Optional[datetime] = None,
        end_at:   Optional[datetime] = None,
    ) -> dict:
        """
        Return {revenue, average_order, orders} for a set of payment methods.
        Optionally scoped to a time window.
        """
        q = self.db.query(
            func.coalesce(func.sum(Order.total_amount), 0),
            func.count(Order.id),
        ).filter(
            func.lower(Order.tracking_status) == REVENUE_STATUS,
            func.lower(Order.payment_status).in_(payment_methods),
        )
        if start_at:
            q = q.filter(Order.ordered_at >= start_at)
        if end_at:
            q = q.filter(Order.ordered_at < end_at)

        total, count = q.one()
        revenue      = float(total or 0)
        order_count  = int(count or 0)

        return {
            "revenue":       revenue,
            "average_order": round(revenue / order_count, 2) if order_count else 0.0,
            "orders":        order_count,
        }

    # ── Category + inventory analytics ───────────────────────────────────────

    def top_categories(self) -> list[dict]:
        """Return top N categories ordered by product count (non-deleted products)."""
        rows = (
            self.db.query(
                Category.name.label("name"),
                func.count(Product.id).label("styles"),
            )
            .outerjoin(
                Product,
                (Product.category_id == Category.id) & Product.deleted_at.is_(None),
            )
            .group_by(Category.name)
            .order_by(func.count(Product.id).desc(), Category.name.asc())
            .limit(TOP_CATEGORIES_LIMIT)
            .all()
        )
        return [{"name": name, "styles": int(styles or 0)} for name, styles in rows]

    def low_stock_summary(self) -> tuple[int, list[dict]]:
        """
        Return (total_low_stock_product_count, top_N_low_stock_products).
        A product is low-stock when ANY of its variants is at or below its threshold.
        """
        low_stock_filter = ProductVariant.stock_quantity <= ProductVariant.low_stock_threshold

        count = (
            self.db.query(func.count(func.distinct(Product.id)))
            .join(ProductVariant)
            .filter(Product.deleted_at.is_(None), low_stock_filter)
            .scalar() or 0
        )

        total_stock = func.coalesce(func.sum(ProductVariant.stock_quantity), 0)

        rows = (
            self.db.query(
                Product.id,
                Product.title,
                total_stock.label("stock"),
                func.count(ProductVariant.id).label("variants"),
            )
            .join(ProductVariant)
            .filter(Product.deleted_at.is_(None), low_stock_filter)
            .group_by(Product.id, Product.title)
            .order_by(total_stock.asc(), Product.title.asc())
            .limit(LOW_STOCK_LIMIT)
            .all()
        )

        products = [
            {
                "id":       product_id,
                "title":    title,
                "stock":    int(stock or 0),
                "variants": int(variants or 0),
            }
            for product_id, title, stock, variants in rows
        ]
        return int(count), products

    # ── Chart data queries ────────────────────────────────────────────────────

    def revenue_orders_in_window(
        self,
        start_at: datetime,
        end_at:   datetime,
    ) -> list:
        """
        Return Order rows (ordered_at + total_amount only needed) for revenue
        chart aggregation. Filtered to realised revenue only.
        """
        return (
            self.db.query(Order.ordered_at, Order.total_amount)
            .filter(
                *self._revenue_filters(),
                Order.ordered_at >= start_at,
                Order.ordered_at <  end_at,
            )
            .all()
        )

    def admins_created_in_window(
        self,
        start_at: datetime,
        end_at:   datetime,
    ) -> list:
        """Return (created_at,) rows for admins created in the given window."""
        return (
            self.db.query(Admin.created_at)
            .filter(Admin.created_at >= start_at, Admin.created_at < end_at)
            .all()
        )

    # ── Recent activity ───────────────────────────────────────────────────────

    def recent_orders(self) -> list:
        """Return (id, order_number, customer_name, ordered_at) for latest N orders."""
        return (
            self.db.query(Order.id, Order.order_number, Order.customer_name, Order.ordered_at)
            .order_by(Order.ordered_at.desc())
            .limit(RECENT_ORDERS_LIMIT)
            .all()
        )

    def recent_products(self) -> list:
        """Return (id, title, updated_at) for latest N non-deleted products."""
        return (
            self.db.query(Product.id, Product.title, Product.updated_at)
            .filter(Product.deleted_at.is_(None))
            .order_by(Product.created_at.desc())
            .limit(RECENT_PRODUCTS_LIMIT)
            .all()
        )
