from fastapi import APIRouter

# Import endpoints individually to avoid import-order/circular-import issues
from app.api.v1.endpoints import auth
from app.api.v1.endpoints import admins
from app.api.v1.endpoints import dashboard
from app.api.v1.endpoints import orders
from app.api.v1.endpoints import products
from app.api.v1.endpoints import offers
from app.api.v1.endpoints import settings
from app.api.v1.endpoints import banners
from app.api.v1.endpoints import customers  # ← NEW

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
try:
	api_router.include_router(banners.router,   prefix="/banners",   tags=["Banners"])
except Exception:
	# Import-time errors in optional endpoints should not stop the app
	# from starting. Log and continue — this avoids worker crashes.
	import logging as _logging
	_logging.getLogger("app").warning("Skipping banners router due to import error")
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