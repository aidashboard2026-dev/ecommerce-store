from fastapi import APIRouter

from app.modules.admins.router import router as admins_router
from app.modules.audit.router import router as audit_router
from app.modules.auth.router import router as auth_router
from app.modules.banners.router import router as banners_router
from app.modules.custom_products.router import router as custom_products_router
from app.modules.customers.router import router as customers_router
from app.modules.dashboard.router import router as dashboard_router
from app.modules.delivery_zones.router import router as delivery_zones_router
from app.modules.categories.router import router as homepage_categories_router
from app.modules.offers.router import router as offers_router
from app.modules.orders.router import router as orders_router
from app.modules.products.router import router as products_router
from app.modules.settings.router import router as settings_router
from app.modules.contact.router import router as contact_router
from app.shared.routing.router import router as routes_router

api_router = APIRouter()

api_router.include_router(auth_router, prefix="/auth", tags=["Authentication"])
api_router.include_router(admins_router, prefix="/admins", tags=["Admins"])
api_router.include_router(dashboard_router, prefix="/dashboard", tags=["Dashboard"])
api_router.include_router(products_router, prefix="/products", tags=["Products"])
api_router.include_router(orders_router, prefix="/orders", tags=["Orders"])
api_router.include_router(offers_router, prefix="/offers", tags=["Offers"])
api_router.include_router(banners_router, prefix="/banners", tags=["Banners"])
api_router.include_router(customers_router, prefix="/customers", tags=["Customers"])
api_router.include_router(custom_products_router, prefix="/custom-products", tags=["Custom Products"])
api_router.include_router(settings_router, prefix="/settings", tags=["Settings"])
api_router.include_router(delivery_zones_router, prefix="/delivery-zones", tags=["Delivery Zones"])
api_router.include_router(audit_router, prefix="/audit", tags=["Audit"])
api_router.include_router(contact_router, prefix="/contact", tags=["Contact"])
api_router.include_router(routes_router, prefix="/admin/routes", tags=["Route Picker"])
from app.modules.admins import router as admins
from app.modules.audit import router as audit
from app.modules.auth import router as auth
from app.modules.banners import router as banners
from app.modules.custom_products import router as custom_products
from app.modules.customers import router as customers
from app.modules.dashboard import router as dashboard
from app.modules.delivery_zones import router as delivery_zones
# from app.modules.homepage_categories.router import router as homepage_categories
from app.modules.offers import router as offers
from app.modules.orders import router as orders
from app.modules.payments import router as payments
from app.modules.products import router as products
from app.modules.settings import router as settings

api_router = APIRouter()

api_router.include_router(auth.router,            prefix="/auth",            tags=["Authentication"])

api_router.include_router(admins.router,           prefix="/admins",          tags=["Admins"])
api_router.include_router(dashboard.router,        prefix="/dashboard",       tags=["Dashboard"])
api_router.include_router(products.router,         prefix="/products",        tags=["Products"])
api_router.include_router(orders.router,           prefix="/orders",          tags=["Orders"])
api_router.include_router(offers.router,           prefix="/offers",          tags=["Offers"])
api_router.include_router(payments.router,         prefix="/payments",        tags=["Payments"])
api_router.include_router(banners.router,          prefix="/banners",         tags=["Banners"])
api_router.include_router(customers.router,        prefix="/customers",       tags=["Customers"])
api_router.include_router(custom_products.router,  prefix="/custom-products", tags=["Custom Products"])
api_router.include_router(settings.router,         prefix="/settings",        tags=["Settings"])
api_router.include_router(delivery_zones.router,   prefix="/delivery-zones",  tags=["Delivery Zones"])
api_router.include_router(audit.router,            prefix="/audit",           tags=["Audit"])


