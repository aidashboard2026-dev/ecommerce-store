from fastapi import APIRouter
from app.api.v1.endpoints import auth, admins, dashboard, orders

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(admins.router, prefix="/admins", tags=["Admins"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
api_router.include_router(orders.router, prefix="/orders", tags=["Orders"])
