from fastapi import APIRouter

from app.modules.admins import router as admins
from app.modules.audit import router as audit
from app.modules.auth import router as auth
from app.modules.banners import router as banners
from app.modules.custom_products import router as custom_products
from app.modules.customers import router as customers
from app.modules.dashboard import router as dashboard
from app.modules.delivery_zones import router as delivery_zones
from app.modules.homepage_categories.router import router as homepage_categories
from app.modules.offers import router as offers
from app.modules.orders import router as orders
from app.modules.products import router as products
from app.modules.settings import router as settings

api_router = APIRouter()

api_router.include_router(auth.router,            prefix="/auth",            tags=["Authentication"])
api_router.include_router(homepage_categories.router,                         tags=["Homepage Categories"])
api_router.include_router(admins.router,           prefix="/admins",          tags=["Admins"])
api_router.include_router(dashboard.router,        prefix="/dashboard",       tags=["Dashboard"])
api_router.include_router(products.router,         prefix="/products",        tags=["Products"])
api_router.include_router(orders.router,           prefix="/orders",          tags=["Orders"])
api_router.include_router(offers.router,           prefix="/offers",          tags=["Offers"])
api_router.include_router(banners.router,          prefix="/banners",         tags=["Banners"])
api_router.include_router(customers.router,        prefix="/customers",       tags=["Customers"])
api_router.include_router(custom_products.router,  prefix="/custom-products", tags=["Custom Products"])
api_router.include_router(settings.router,         prefix="/settings",        tags=["Settings"])
api_router.include_router(delivery_zones.router,   prefix="/delivery-zones",  tags=["Delivery Zones"])
api_router.include_router(audit.router,            prefix="/audit",           tags=["Audit"])
