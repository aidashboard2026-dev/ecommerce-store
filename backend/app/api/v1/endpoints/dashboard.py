from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.auth.dependencies import get_current_admin
from app.models.admin import Admin
from app.services.admin_service import get_admins_count
import random
from datetime import datetime, timedelta

router = APIRouter()


@router.get("/stats")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    user_count = get_admins_count(db)

    # Simulated stats for demo purposes
    return {
        "total_users": user_count,
        "total_products": 1284,
        "total_revenue": 94280.50,
        "active_sessions": random.randint(45, 120),
        "revenue_growth": 12.5,
        "user_growth": 8.2,
        "product_growth": 3.7,
        "session_growth": -2.1,
    }


@router.get("/chart-data")
def get_chart_data(current_admin: Admin = Depends(get_current_admin)):
    # Generate 12 months of revenue data
    months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
              "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    revenue_data = [
        {"month": m, "revenue": random.randint(6000, 15000), "users": random.randint(100, 500)}
        for m in months
    ]
    return {"monthly": revenue_data}


@router.get("/recent-activity")
def get_recent_activity(current_admin: Admin = Depends(get_current_admin)):
    activities = [
        {"id": 1, "type": "user_created", "message": "New admin Jane Smith joined", "time": "2 min ago"},
        {"id": 2, "type": "product_updated", "message": "Product #1024 inventory updated", "time": "15 min ago"},
        {"id": 3, "type": "login", "message": "Super Admin logged in from new device", "time": "1 hr ago"},
        {"id": 4, "type": "revenue", "message": "Monthly revenue target achieved", "time": "3 hrs ago"},
        {"id": 5, "type": "alert", "message": "Server load peaked at 87%", "time": "5 hrs ago"},
    ]
    return {"activities": activities}
