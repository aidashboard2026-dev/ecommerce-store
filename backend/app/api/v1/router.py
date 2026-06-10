from fastapi import APIRouter
from app.api.v1.endpoints import auth, admins, dashboard, orders, products, offers
from app.api.v1.endpoints import customers  # ← NEW

api_router = APIRouter()

api_router.include_router(auth.router,      prefix="/auth",      tags=["Authentication"])
api_router.include_router(admins.router,    prefix="/admins",    tags=["Admins"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
api_router.include_router(products.router,  prefix="/products",  tags=["Products"])
api_router.include_router(orders.router,    prefix="/orders",    tags=["Orders"])
api_router.include_router(offers.router,    prefix="/offers",    tags=["Offers"])
api_router.include_router(customers.router, prefix="/customers", tags=["Customers"])