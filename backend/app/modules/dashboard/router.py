from calendar import month_abbr
from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.modules.auth.dependencies import get_current_admin
from app.core.database import get_db
from app.modules.admins.models import Admin
from app.modules.orders.models import Order
from app.modules.products.models import Product, ProductVariant
from app.modules.admins.service import get_admins_count
from app.modules.products.service import get_products_count, get_published_products_count

router = APIRouter()

ACTIVE_SALES_STATUSES = ("placed", "pending", "processing", "shipped", "delivered")  # FIX C-3A: added "placed"
REVENUE_STATUS = "delivered"
REVENUE_PAYMENT = "paid"
CASH_PAYMENT_METHODS = ("cod", "cash", "cash on delivery")
UPI_PAYMENT_METHODS = ("paid", "upi", "online", "razorpay")
WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]


def _money(value: Decimal | int | float | None) -> float:
    return float(value or 0)


def _growth(current: float, previous: float) -> float:
    if previous == 0:
        return 100.0 if current > 0 else 0.0

    return round(((current - previous) / previous) * 100, 1)


def _start_of_day(value: date) -> datetime:
    return datetime.combine(value, time.min, tzinfo=timezone.utc)


def _add_months(value: date, months: int) -> date:
    month_index = value.month - 1 + months
    year = value.year + month_index // 12
    month = month_index % 12 + 1
    return date(year, month, 1)


def _orders_between(db: Session, start_at: datetime, end_at: datetime) -> list[Order]:

    # print("START:", start_at)
    # print("END:", end_at)

    orders = (
        db.query(Order)
        .filter(
            func.lower(Order.tracking_status).in_(ACTIVE_SALES_STATUSES),  # FIX C-3B: case-insensitive
            Order.ordered_at >= start_at,
            Order.ordered_at < end_at,
        )
        .all()
    )

    # print("FOUND ORDERS:", len(orders))

    # for order in orders:
    #     print(
    #         order.id,
    #         order.customer_name,
    #         order.tracking_status,
    #         order.ordered_at
    #     )

    return orders


def _revenue_filter():
    return (
        func.lower(Order.tracking_status) == REVENUE_STATUS,
        func.lower(Order.payment_status) == REVENUE_PAYMENT,
    )


def _revenue_orders_between(db: Session, start_at: datetime, end_at: datetime) -> list[Order]:
    return (
        db.query(Order)
        .filter(
            *_revenue_filter(),
            Order.ordered_at >= start_at,
            Order.ordered_at < end_at,
        )
        .all()
    )


def _sum_orders(
    db: Session,
    start_at: Optional[datetime] = None,
    end_at: Optional[datetime] = None,
) -> float:
    query = db.query(func.coalesce(func.sum(Order.total_amount), 0)).filter(*_revenue_filter())

    if start_at:
        query = query.filter(Order.ordered_at >= start_at)

    if end_at:
        query = query.filter(Order.ordered_at < end_at)

    return _money(query.scalar())


def _payment_revenue_summary(db: Session, payment_methods: tuple[str, ...], start_at: Optional[datetime] = None, end_at: Optional[datetime] = None) -> dict:
    query = db.query(
        func.coalesce(func.sum(Order.total_amount), 0),
        func.count(Order.id),
    ).filter(
        func.lower(Order.tracking_status) == REVENUE_STATUS,
        func.lower(Order.payment_status).in_(payment_methods),
    )
    
    if start_at:
        query = query.filter(Order.ordered_at >= start_at)
    if end_at:
        query = query.filter(Order.ordered_at < end_at)

    total, count = query.one()

    revenue = _money(total)
    order_count = int(count or 0)

    return {
        "revenue": revenue,
        "average_order": round(revenue / order_count, 2) if order_count else 0,
        "orders": order_count,
    }


def _top_categories(db: Session) -> list[dict]:
    category_name = func.coalesce(func.nullif(Product.collection, ""), "Uncategorized")

    rows = (
        db.query(
            category_name.label("name"),
            func.count(Product.id).label("styles"),
        )
        .filter(Product.deleted_at.is_(None))
        .group_by(category_name)
        .order_by(func.count(Product.id).desc(), category_name.asc())
        .limit(3)
        .all()
    )

    return [
        {
            "name": name,
            "styles": int(styles or 0),
        }
        for name, styles in rows
    ]


def _low_stock_products(db: Session) -> tuple[int, list[dict]]:
    low_stock_filter = ProductVariant.stock_quantity <= ProductVariant.low_stock_threshold

    low_stock_count = (
        db.query(func.count(func.distinct(Product.id)))
        .join(ProductVariant)
        .filter(Product.deleted_at.is_(None), low_stock_filter)
        .scalar()
    )

    total_stock = func.coalesce(func.sum(ProductVariant.stock_quantity), 0)

    rows = (
        db.query(
            Product.id,
            Product.title,
            total_stock.label("stock"),
            func.count(ProductVariant.id).label("variants"),
        )
        .join(ProductVariant)
        .filter(Product.deleted_at.is_(None), low_stock_filter)
        .group_by(Product.id, Product.title)
        .order_by(total_stock.asc(), Product.title.asc())
        .limit(3)
        .all()
    )

    products = [
        {
            "id": product_id,
            "title": title,
            "stock": int(stock or 0),
            "variants": int(variants or 0),
        }
        for product_id, title, stock, variants in rows
    ]

    return int(low_stock_count or 0), products


def _admin_count_between(db: Session, start_at: datetime, end_at: datetime) -> int:
    return (
        db.query(func.count(Admin.id))
        .filter(
            Admin.created_at >= start_at,
            Admin.created_at < end_at,
        )
        .scalar() or 0
    )


def _product_count_between(
    db: Session,
    start_at: datetime,
    end_at: datetime,
    published_only: bool = False,
) -> int:
    query = db.query(func.count(Product.id)).filter(
        Product.deleted_at.is_(None),
        Product.created_at >= start_at,
        Product.created_at < end_at,
    )
    if published_only:
        query = query.filter(Product.status == "published")
    return query.scalar() or 0


def _order_count_between(db: Session, start_at: datetime, end_at: datetime) -> int:
    return (
        db.query(func.count(Order.id))
        .filter(
            func.lower(Order.tracking_status).in_(ACTIVE_SALES_STATUSES),  # FIX C-3B: case-insensitive
            Order.ordered_at >= start_at,
            Order.ordered_at < end_at,
        )
        .scalar() or 0
    )


@router.get("/stats")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    user_count = get_admins_count(db)
    product_count = get_products_count(db)
    published_product_count = get_published_products_count(db)

    order_count = db.query(Order).filter(
        func.lower(Order.tracking_status).in_(ACTIVE_SALES_STATUSES)  # FIX C-3B: case-insensitive
    ).count()

    total_revenue = _sum_orders(db)

    now = datetime.now(timezone.utc)
    current_window_start = now - timedelta(days=30)
    previous_window_start = now - timedelta(days=60)

    current_revenue = _sum_orders(db, current_window_start, now)
    previous_revenue = _sum_orders(
        db,
        previous_window_start,
        current_window_start,
    )
    
    # Calculate current and previous cash revenue
    current_cash_summary = _payment_revenue_summary(db, CASH_PAYMENT_METHODS, current_window_start, now)
    previous_cash_summary = _payment_revenue_summary(db, CASH_PAYMENT_METHODS, previous_window_start, current_window_start)
    
    # Calculate current and previous UPI revenue
    current_upi_summary = _payment_revenue_summary(db, UPI_PAYMENT_METHODS, current_window_start, now)
    previous_upi_summary = _payment_revenue_summary(db, UPI_PAYMENT_METHODS, previous_window_start, current_window_start)

    # Real user (admin) growth: admins created in the last 30 days vs. the
    # preceding 30-day window.
    current_admin_count = _admin_count_between(db, current_window_start, now)
    previous_admin_count = _admin_count_between(db, previous_window_start, current_window_start)
    user_growth = _growth(current_admin_count, previous_admin_count)

    # Real product growth: products created in the last 30 days vs. the
    # preceding 30-day window.
    current_product_count = _product_count_between(db, current_window_start, now)
    previous_product_count = _product_count_between(db, previous_window_start, current_window_start)
    product_growth = _growth(current_product_count, previous_product_count)

    # Get overall summaries too
    cash_summary = _payment_revenue_summary(db, CASH_PAYMENT_METHODS)
    upi_summary = _payment_revenue_summary(db, UPI_PAYMENT_METHODS)
    low_stock_count, low_stock_products = _low_stock_products(db)

    return {
        "total_users": user_count,
        "total_products": product_count,
        "total_revenue": total_revenue,
        "total_orders": order_count,
        "published_products": published_product_count,
        "active_sessions": published_product_count,
        "revenue_growth": _growth(current_revenue, previous_revenue),
        "user_growth": user_growth,
        "product_growth": product_growth,
        "published_growth": 0.0,
        "session_growth": 0.0,
        "cash_revenue": cash_summary["revenue"],
        "cash_average_order": cash_summary["average_order"],
        "cash_orders": cash_summary["orders"],
        "cash_revenue_growth": _growth(current_cash_summary["revenue"], previous_cash_summary["revenue"]),
        "upi_revenue": upi_summary["revenue"],
        "upi_average_order": upi_summary["average_order"],
        "upi_orders": upi_summary["orders"],
        "upi_revenue_growth": _growth(current_upi_summary["revenue"], previous_upi_summary["revenue"]),
        "top_categories": _top_categories(db),
        "low_stock_products": low_stock_products,
        "low_stock_product_count": low_stock_count,
    }


@router.get("/chart-data")
def get_chart_data(
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    today = datetime.now(timezone.utc).date()
    year_start = date(today.year, 1, 1)
    year_end = date(today.year + 1, 1, 1)

    orders = _revenue_orders_between(
        db,
        _start_of_day(year_start),
        _start_of_day(year_end),
    )

    admins = (
        db.query(Admin)
        .filter(
            Admin.created_at >= _start_of_day(year_start),
            Admin.created_at < _start_of_day(year_end),
        )
        .all()
    )

    revenue_by_month = {month: 0.0 for month in range(1, 13)}
    users_by_month = {month: 0 for month in range(1, 13)}

    for order in orders:
        revenue_by_month[order.ordered_at.month] += _money(order.total_amount)
    for admin in admins:
        if admin.created_at:
            users_by_month[admin.created_at.month] += 1

    return {
        "monthly": [
            {
                "month": month_abbr[month],
                "revenue": revenue_by_month[month],
                "users": users_by_month[month],
            }
            for month in range(1, 13)
        ]
    }


@router.get("/sales-chart")
def get_sales_chart(
    period: str = Query(default="weekly", pattern="^(weekly|monthly)$"),
    anchor_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    anchor = anchor_date or datetime.now(timezone.utc).date()

    if period == "weekly":
        start_date = anchor - timedelta(days=anchor.weekday())
        end_date = start_date + timedelta(days=7)

        orders = _revenue_orders_between(
            db,
            _start_of_day(start_date),
            _start_of_day(end_date),
        )

        totals = {day: 0.0 for day in range(7)}

        for order in orders:
            totals[order.ordered_at.weekday()] += _money(order.total_amount)
        return {
            "period": "weekly",
            "anchor_date": anchor.isoformat(),
            "range_start": start_date.isoformat(),
            "range_end": (end_date - timedelta(days=1)).isoformat(),
            "range_label": f"{start_date.strftime('%b %d')} - {(end_date - timedelta(days=1)).strftime('%b %d, %Y')}",
            "data": [
                {
                    "label": label,
                    "amount": round(totals[index], 2),
                }
                for index, label in enumerate(WEEKDAY_LABELS)
            ],
        }

    anchor_month = date(anchor.year, anchor.month, 1)
    start_month = _add_months(anchor_month, -11)
    end_month = _add_months(anchor_month, 1)

    orders = _revenue_orders_between(
        db,
        _start_of_day(start_month),
        _start_of_day(end_month),
    )

    month_keys = [_add_months(start_month, index) for index in range(12)]

    totals = {(month.year, month.month): 0.0 for month in month_keys}

    for order in orders:
        totals[(order.ordered_at.year, order.ordered_at.month)] += _money(order.total_amount)
    return {
        "period": "monthly",
        "anchor_date": anchor.isoformat(),
        "range_start": start_month.isoformat(),
        "range_end": (end_month - timedelta(days=1)).isoformat(),
        "range_label": f"{start_month.strftime('%b %Y')} - {anchor_month.strftime('%b %Y')}",
        "data": [
            {
                "label": month_abbr[month.month],
                "amount": round(totals[(month.year, month.month)], 2),
            }
            for month in month_keys
        ],
    }


@router.get("/recent-activity")
def get_recent_activity(
    current_admin: Admin = Depends(get_current_admin),
):
    activities = [
        {
            "id": 1,
            "type": "user_created",
            "message": "New admin Jane Smith joined",
            "time": "2 min ago",
        },
        {
            "id": 2,
            "type": "product_updated",
            "message": "Product #1024 inventory updated",
            "time": "15 min ago",
        },
        {
            "id": 3,
            "type": "login",
            "message": "Super Admin logged in from new device",
            "time": "1 hr ago",
        },
        {
            "id": 4,
            "type": "revenue",
            "message": "Sales dashboard refreshed from orders",
            "time": "3 hrs ago",
        },
        {
            "id": 5,
            "type": "alert",
            "message": "Server load peaked at 87%",
            "time": "5 hrs ago",
        },
    ]

    return {"activities": activities}