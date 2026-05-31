from calendar import month_abbr
from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_admin
from app.database.session import get_db
from app.models.admin import Admin
from app.models.order import Order
from app.services.admin_service import get_admins_count

router = APIRouter()

ACTIVE_SALES_STATUSES = ("pending", "processing", "shipped", "delivered")
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
    return (
        db.query(Order)
        .filter(
            Order.status.in_(ACTIVE_SALES_STATUSES),
            Order.ordered_at >= start_at,
            Order.ordered_at < end_at,
        )
        .all()
    )


def _sum_orders(db: Session, start_at: Optional[datetime] = None, end_at: Optional[datetime] = None) -> float:
    query = db.query(func.coalesce(func.sum(Order.total), 0)).filter(
        Order.status.in_(ACTIVE_SALES_STATUSES)
    )

    if start_at:
        query = query.filter(Order.ordered_at >= start_at)

    if end_at:
        query = query.filter(Order.ordered_at < end_at)

    return _money(query.scalar())


@router.get("/stats")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    user_count = get_admins_count(db)
    order_count = db.query(Order).filter(Order.status.in_(ACTIVE_SALES_STATUSES)).count()
    total_revenue = _sum_orders(db)

    now = datetime.now(timezone.utc)
    current_window_start = now - timedelta(days=30)
    previous_window_start = now - timedelta(days=60)
    current_revenue = _sum_orders(db, current_window_start, now)
    previous_revenue = _sum_orders(db, previous_window_start, current_window_start)

    return {
        "total_users": user_count,
        "total_products": 8,
        "total_revenue": total_revenue,
        "total_orders": order_count,
        "active_sessions": 0,
        "revenue_growth": _growth(current_revenue, previous_revenue),
        "user_growth": 0,
        "product_growth": 0,
        "session_growth": 0,
    }


@router.get("/chart-data")
def get_chart_data(
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    today = datetime.now(timezone.utc).date()
    year_start = date(today.year, 1, 1)
    year_end = date(today.year + 1, 1, 1)
    orders = _orders_between(db, _start_of_day(year_start), _start_of_day(year_end))
    admins = (
        db.query(Admin)
        .filter(Admin.created_at >= _start_of_day(year_start), Admin.created_at < _start_of_day(year_end))
        .all()
    )

    revenue_by_month = {month: 0.0 for month in range(1, 13)}
    users_by_month = {month: 0 for month in range(1, 13)}

    for order in orders:
        revenue_by_month[order.ordered_at.month] += _money(order.total)

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
        orders = _orders_between(db, _start_of_day(start_date), _start_of_day(end_date))
        totals = {day: 0.0 for day in range(7)}

        for order in orders:
            totals[order.ordered_at.weekday()] += _money(order.total)

        return {
            "period": "weekly",
            "anchor_date": anchor.isoformat(),
            "range_start": start_date.isoformat(),
            "range_end": (end_date - timedelta(days=1)).isoformat(),
            "range_label": f"{start_date.strftime('%b %d')} - {(end_date - timedelta(days=1)).strftime('%b %d, %Y')}",
            "data": [
                {"label": label, "amount": round(totals[index], 2)}
                for index, label in enumerate(WEEKDAY_LABELS)
            ],
        }

    anchor_month = date(anchor.year, anchor.month, 1)
    start_month = _add_months(anchor_month, -11)
    end_month = _add_months(anchor_month, 1)
    orders = _orders_between(db, _start_of_day(start_month), _start_of_day(end_month))
    month_keys = [_add_months(start_month, index) for index in range(12)]
    totals = {(month.year, month.month): 0.0 for month in month_keys}

    for order in orders:
        totals[(order.ordered_at.year, order.ordered_at.month)] += _money(order.total)

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
def get_recent_activity(current_admin: Admin = Depends(get_current_admin)):
    activities = [
        {"id": 1, "type": "user_created", "message": "New admin Jane Smith joined", "time": "2 min ago"},
        {"id": 2, "type": "product_updated", "message": "Product #1024 inventory updated", "time": "15 min ago"},
        {"id": 3, "type": "login", "message": "Super Admin logged in from new device", "time": "1 hr ago"},
        {"id": 4, "type": "revenue", "message": "Sales dashboard refreshed from orders", "time": "3 hrs ago"},
        {"id": 5, "type": "alert", "message": "Server load peaked at 87%", "time": "5 hrs ago"},
    ]
    return {"activities": activities}
