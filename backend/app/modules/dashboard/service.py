"""
app/modules/dashboard/service.py

Dashboard business logic and response assembly.

Responsibilities:
  - Call DashboardRepository for raw data
  - Compute growth percentages, aggregations, and chart series
  - Assemble typed Pydantic response objects
  - Own date-window arithmetic

What this layer does NOT do:
  - No SQLAlchemy
  - No HTTP context
  - No domain writes
"""

from __future__ import annotations

from calendar import month_abbr
from datetime import date, datetime, time, timedelta, timezone
from typing import Optional

from sqlalchemy.orm import Session

from app.modules.dashboard.constants import (
    CASH_PAYMENT_METHODS,
    GROWTH_WINDOW_DAYS,
    RECENT_ACTIVITY_LIMIT,
    UPI_PAYMENT_METHODS,
    WEEKDAY_LABELS,
)
from app.modules.dashboard.repository import DashboardRepository
from app.modules.dashboard.schemas import (
    ActivityItem,
    CategoryStat,
    ChartDataResponse,
    DashboardStatsResponse,
    LowStockProduct,
    MonthlyDataPoint,
    RecentActivityResponse,
    SalesChartResponse,
    SalesDataPoint,
)


# ── Pure utility helpers ──────────────────────────────────────────────────────

def _money(value) -> float:
    """Coerce any numeric-or-None to float."""
    return float(value or 0)


def _growth(current: float, previous: float) -> float:
    """
    Return percentage growth between two values.
    Returns 100.0 when current > 0 and previous == 0 (new metric).
    Returns 0.0 when both are 0.
    """
    if previous == 0:
        return 100.0 if current > 0 else 0.0
    return round(((current - previous) / previous) * 100, 1)


def _start_of_day(value: date) -> datetime:
    """Return timezone-aware midnight UTC for the given date."""
    return datetime.combine(value, time.min, tzinfo=timezone.utc)


def _add_months(value: date, months: int) -> date:
    """Add N calendar months to a date — handles year wrap correctly."""
    month_index = value.month - 1 + months
    year        = value.year + month_index // 12
    month       = month_index % 12 + 1
    return date(year, month, 1)


def _growth_windows(now: datetime) -> tuple[datetime, datetime, datetime]:
    """
    Return (current_start, previous_start, now) for a GROWTH_WINDOW_DAYS
    comparison. The current window is [current_start, now); the previous
    window is [previous_start, current_start).
    """
    current_start  = now - timedelta(days=GROWTH_WINDOW_DAYS)
    previous_start = now - timedelta(days=GROWTH_WINDOW_DAYS * 2)
    return current_start, previous_start, now


# ── Service functions ─────────────────────────────────────────────────────────

def get_stats(db: Session) -> DashboardStatsResponse:
    """
    Aggregate all KPIs for the admin dashboard stats panel.
    Single DB session, multiple focused queries via the repository.
    """
    repo = DashboardRepository(db)
    now  = datetime.now(timezone.utc)

    current_start, previous_start, _ = _growth_windows(now)

    # ── Totals ────────────────────────────────────────────────────────────────
    total_orders    = repo.total_active_order_count()
    total_revenue   = repo.total_revenue()
    total_users     = repo.admin_count()
    total_products  = repo.product_count()
    published       = repo.product_count(published_only=True)

    # ── Growth windows ────────────────────────────────────────────────────────
    cur_revenue  = repo.revenue_in_window(current_start, now)
    prev_revenue = repo.revenue_in_window(previous_start, current_start)

    cur_admins   = repo.admin_count_in_window(current_start, now)
    prev_admins  = repo.admin_count_in_window(previous_start, current_start)

    cur_products = repo.product_count_in_window(current_start, now)
    prev_products= repo.product_count_in_window(previous_start, current_start)

    # ── Payment method breakdowns ──────────────────────────────────────────────
    cash_all  = repo.payment_revenue_summary(CASH_PAYMENT_METHODS)
    upi_all   = repo.payment_revenue_summary(UPI_PAYMENT_METHODS)
    cash_cur  = repo.payment_revenue_summary(CASH_PAYMENT_METHODS, current_start, now)
    cash_prev = repo.payment_revenue_summary(CASH_PAYMENT_METHODS, previous_start, current_start)
    upi_cur   = repo.payment_revenue_summary(UPI_PAYMENT_METHODS,  current_start, now)
    upi_prev  = repo.payment_revenue_summary(UPI_PAYMENT_METHODS,  previous_start, current_start)

    # ── Inventory ─────────────────────────────────────────────────────────────
    top_cats                  = repo.top_categories()
    low_stock_count, low_stock= repo.low_stock_summary()

    return DashboardStatsResponse(
        total_users=total_users,
        total_products=total_products,
        total_revenue=total_revenue,
        total_orders=total_orders,
        published_products=published,

        revenue_growth=_growth(cur_revenue, prev_revenue),
        user_growth=_growth(cur_admins, prev_admins),
        product_growth=_growth(cur_products, prev_products),

        cash_revenue=cash_all["revenue"],
        cash_average_order=cash_all["average_order"],
        cash_orders=cash_all["orders"],
        cash_revenue_growth=_growth(cash_cur["revenue"], cash_prev["revenue"]),

        upi_revenue=upi_all["revenue"],
        upi_average_order=upi_all["average_order"],
        upi_orders=upi_all["orders"],
        upi_revenue_growth=_growth(upi_cur["revenue"], upi_prev["revenue"]),

        top_categories=[CategoryStat(**c) for c in top_cats],
        low_stock_products=[LowStockProduct(**p) for p in low_stock],
        low_stock_product_count=low_stock_count,
    )


def get_chart_data(db: Session) -> ChartDataResponse:
    """
    Monthly revenue + admin sign-up counts for the current calendar year.
    Used by the admin panel's main revenue/users chart.
    """
    repo  = DashboardRepository(db)
    today = datetime.now(timezone.utc).date()

    year_start = date(today.year, 1, 1)
    year_end   = date(today.year + 1, 1, 1)

    order_rows  = repo.revenue_orders_in_window(
        _start_of_day(year_start), _start_of_day(year_end),
    )
    admin_rows  = repo.admins_created_in_window(
        _start_of_day(year_start), _start_of_day(year_end),
    )

    revenue_by_month = {m: 0.0 for m in range(1, 13)}
    users_by_month   = {m: 0   for m in range(1, 13)}

    for ordered_at, total_amount in order_rows:
        revenue_by_month[ordered_at.month] += _money(total_amount)

    for (created_at,) in admin_rows:
        if created_at:
            users_by_month[created_at.month] += 1

    return ChartDataResponse(
        monthly=[
            MonthlyDataPoint(
                month=month_abbr[m],
                revenue=round(revenue_by_month[m], 2),
                users=users_by_month[m],
            )
            for m in range(1, 13)
        ]
    )


def get_sales_chart(
    db:          Session,
    period:      str,
    anchor_date: Optional[date] = None,
) -> SalesChartResponse:
    """
    Weekly or rolling-12-month sales chart for the admin panel.

    Weekly:  Returns daily totals for the calendar week containing anchor_date.
    Monthly: Returns monthly totals for the 12 months ending at anchor_date's month.
    """
    repo   = DashboardRepository(db)
    anchor = anchor_date or datetime.now(timezone.utc).date()

    if period == "weekly":
        start_date = anchor - timedelta(days=anchor.weekday())
        end_date   = start_date + timedelta(days=7)

        rows   = repo.revenue_orders_in_window(
            _start_of_day(start_date), _start_of_day(end_date),
        )
        totals = {day: 0.0 for day in range(7)}
        for ordered_at, total_amount in rows:
            totals[ordered_at.weekday()] += _money(total_amount)

        return SalesChartResponse(
            period="weekly",
            anchor_date=anchor.isoformat(),
            range_start=start_date.isoformat(),
            range_end=(end_date - timedelta(days=1)).isoformat(),
            range_label=(
                f"{start_date.strftime('%b %d')} - "
                f"{(end_date - timedelta(days=1)).strftime('%b %d, %Y')}"
            ),
            data=[
                SalesDataPoint(label=label, amount=round(totals[i], 2))
                for i, label in enumerate(WEEKDAY_LABELS)
            ],
        )

    # Monthly — rolling 12 months ending at anchor's month
    anchor_month = date(anchor.year, anchor.month, 1)
    start_month  = _add_months(anchor_month, -11)
    end_month    = _add_months(anchor_month, 1)

    rows       = repo.revenue_orders_in_window(
        _start_of_day(start_month), _start_of_day(end_month),
    )
    month_keys = [_add_months(start_month, i) for i in range(12)]
    totals     = {(m.year, m.month): 0.0 for m in month_keys}

    for ordered_at, total_amount in rows:
        key = (ordered_at.year, ordered_at.month)
        if key in totals:
            totals[key] += _money(total_amount)

    return SalesChartResponse(
        period="monthly",
        anchor_date=anchor.isoformat(),
        range_start=start_month.isoformat(),
        range_end=(end_month - timedelta(days=1)).isoformat(),
        range_label=(
            f"{start_month.strftime('%b %Y')} - "
            f"{anchor_month.strftime('%b %Y')}"
        ),
        data=[
            SalesDataPoint(
                label=month_abbr[m.month],
                amount=round(totals[(m.year, m.month)], 2),
            )
            for m in month_keys
        ],
    )


def get_recent_activity(db: Session) -> RecentActivityResponse:
    """
    Build a merged, time-sorted activity feed from recent orders and products.
    Returns the top RECENT_ACTIVITY_LIMIT items.
    """
    repo       = DashboardRepository(db)
    activities = []

    for order_id, order_number, customer_name, ordered_at in repo.recent_orders():
        activities.append(ActivityItem(
            id=f"order-{order_id}",
            type="order_placed",
            message=f"New order {order_number} from {customer_name}",
            time=ordered_at.isoformat() if ordered_at else "",
        ))

    for product_id, title, updated_at in repo.recent_products():
        activities.append(ActivityItem(
            id=f"product-{product_id}",
            type="product_updated",
            message=f"Product '{title}' added/updated",
            time=updated_at.isoformat() if updated_at else "",
        ))

    activities.sort(key=lambda x: x.time, reverse=True)

    return RecentActivityResponse(activities=activities[:RECENT_ACTIVITY_LIMIT])
