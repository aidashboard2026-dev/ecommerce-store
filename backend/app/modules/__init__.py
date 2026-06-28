# Import all models so SQLAlchemy registers every table with Base.metadata.
from app.modules.admins.models import Admin  # noqa: F401
from app.modules.audit.models import AuditLog  # noqa: F401
from app.modules.banners.models import Banner  # noqa: F401
from app.modules.custom_products.models import CustomCategory, CustomProduct  # noqa: F401
from app.modules.customers.models import Customer  # noqa: F401
from app.modules.delivery_zones.models import DeliveryZone  # noqa: F401
from app.modules.offers.models import Offer  # noqa: F401
from app.modules.orders.models import Order  # noqa: F401
from app.modules.products.models import Category, Collection, Product, ProductVariant  # noqa: F401
from app.modules.settings.models import (  # noqa: F401
    AdminSecurity,
    NotificationSetting,
    PaymentMethod,
    StoreSettings,
)
