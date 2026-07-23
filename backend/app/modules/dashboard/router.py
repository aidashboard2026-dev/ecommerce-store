"""
app/modules/dashboard/router.py

Thin dashboard router — zero SQL, zero business logic.
All computation lives in dashboard/service.py.
"""

from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.modules.admins.models import Admin
from app.modules.auth.dependencies import get_current_admin
from app.modules.dashboard import service as dashboard_service
from app.modules.dashboard.schemas import (
    ChartDataResponse,
    DashboardStatsResponse,
    RecentActivityResponse,
    SalesChartResponse,
)

router = APIRouter()


@router.get("/stats", response_model=DashboardStatsResponse)
def get_dashboard_stats(
    db:            Session = Depends(get_db),
    current_admin: Admin   = Depends(get_current_admin),
):
    """Admin dashboard KPIs — totals, growth, payment breakdown, inventory alerts."""
    return dashboard_service.get_stats(db)


@router.get("/chart-data", response_model=ChartDataResponse)
def get_chart_data(
    db:            Session = Depends(get_db),
    current_admin: Admin   = Depends(get_current_admin),
):
    """Monthly revenue and admin sign-up counts for the current calendar year."""
    return dashboard_service.get_chart_data(db)


@router.get("/sales-chart", response_model=SalesChartResponse)
def get_sales_chart(
    period:      str           = Query(default="weekly", pattern="^(weekly|monthly)$"),
    anchor_date: Optional[date]= None,
    db:          Session       = Depends(get_db),
    current_admin: Admin       = Depends(get_current_admin),
):
    """Weekly or rolling-12-month sales chart data."""
    return dashboard_service.get_sales_chart(db, period=period, anchor_date=anchor_date)


@router.get("/recent-activity", response_model=RecentActivityResponse)
def get_recent_activity(
    db:            Session = Depends(get_db),
    current_admin: Admin   = Depends(get_current_admin),
):
    """Time-sorted feed of recent orders and product changes."""
    return dashboard_service.get_recent_activity(db)
