"""
app/modules/dashboard/schemas.py

Pydantic response schemas for all dashboard endpoints.

Previously every endpoint returned raw dicts. Pydantic schemas provide:
  - Type safety at the service layer
  - Auto-generated OpenAPI docs with real field types
  - Serialization consistency (float precision, None handling)
"""

from __future__ import annotations

from typing import List, Optional
from pydantic import BaseModel

from app.modules.contact.schemas import ContactMessageResponse


# ── /stats ────────────────────────────────────────────────────────────────────

class CategoryStat(BaseModel):
    name:   str
    styles: int


class LowStockProduct(BaseModel):
    id:       int
    title:    str
    stock:    int
    variants: int


class DashboardStatsResponse(BaseModel):
    # Totals
    total_users:     int
    total_products:  int
    total_revenue:   float
    total_orders:    int
    published_products: int
    total_messages:  int
    today_messages:  int
    week_messages:   int
    month_messages:  int
    pending_messages: int
    closed_messages: int

    # Growth (30-day window vs prior 30-day window)
    revenue_growth: float
    user_growth:    float
    product_growth: float

    # Cash revenue breakdown
    cash_revenue:        float
    cash_average_order:  float
    cash_orders:         int
    cash_revenue_growth: float

    # UPI / online revenue breakdown
    upi_revenue:        float
    upi_average_order:  float
    upi_orders:         int
    upi_revenue_growth: float

    # Inventory alerts
    top_categories:          List[CategoryStat]
    low_stock_products:      List[LowStockProduct]
    low_stock_product_count: int
    recent_contact_messages: List[ContactMessageResponse]

# ── /chart-data ───────────────────────────────────────────────────────────────

class MonthlyDataPoint(BaseModel):
    month:   str    # "Jan", "Feb", …
    revenue: float
    users:   int


class ChartDataResponse(BaseModel):
    monthly: List[MonthlyDataPoint]


# ── /sales-chart ──────────────────────────────────────────────────────────────

class SalesDataPoint(BaseModel):
    label:  str    # weekday abbreviation or month abbreviation
    amount: float


class SalesChartResponse(BaseModel):
    period:      str   # "weekly" | "monthly"
    anchor_date: str
    range_start: str
    range_end:   str
    range_label: str
    data:        List[SalesDataPoint]


# ── /recent-activity ──────────────────────────────────────────────────────────

class ActivityItem(BaseModel):
    id:      str
    type:    str
    message: str
    time:    str


class RecentActivityResponse(BaseModel):
    activities: List[ActivityItem]
