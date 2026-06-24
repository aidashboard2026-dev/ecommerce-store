from fastapi import APIRouter

from app.api.v1.endpoints import (
    auth,
    admins,
    dashboard,
    orders,
    products,
    offers,
    settings,
    banners,
    customers,
    custom_products,
)
api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(admins.router, prefix="/admins", tags=["Admins"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
api_router.include_router(products.router, prefix="/products", tags=["Products"])
api_router.include_router(orders.router, prefix="/orders", tags=["Orders"])
api_router.include_router(offers.router, prefix="/offers", tags=["Offers"])
api_router.include_router(banners.router, prefix="/banners", tags=["Banners"])
api_router.include_router(customers.router, prefix="/customers", tags=["Customers"])

api_router.include_router(
    custom_products.router,
    prefix="/custom-products",
    tags=["Custom Products"]
)
api_router.include_router(products.router,  prefix="/products",  tags=["Products"])
api_router.include_router(orders.router,    prefix="/orders",    tags=["Orders"])
api_router.include_router(offers.router,    prefix="/offers",    tags=["Offers"])
api_router.include_router(banners.router,   prefix="/banners",   tags=["Banners"])
api_router.include_router(customers.router, prefix="/customers", tags=["Customers"])


from fastapi import APIRouter
from app.api.v1.endpoints import auth, admins, dashboard, orders, products, offers, banners
from app.api.v1.endpoints import customers
from app.api.v1.endpoints import delivery_zones

api_router = APIRouter()

api_router.include_router(auth.router,           prefix="/auth",            tags=["Authentication"])
api_router.include_router(admins.router,         prefix="/admins",          tags=["Admins"])
api_router.include_router(dashboard.router,      prefix="/dashboard",       tags=["Dashboard"])
api_router.include_router(products.router,       prefix="/products",        tags=["Products"])
api_router.include_router(orders.router,         prefix="/orders",          tags=["Orders"])
api_router.include_router(offers.router,         prefix="/offers",          tags=["Offers"])
api_router.include_router(banners.router,        prefix="/banners",         tags=["Banners"])
api_router.include_router(customers.router,      prefix="/customers",       tags=["Customers"])
api_router.include_router(delivery_zones.router, prefix="/delivery-zones",  tags=["Delivery Zones"])