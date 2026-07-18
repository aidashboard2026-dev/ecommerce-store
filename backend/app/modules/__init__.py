# Import all models so SQLAlchemy registers every table with Base.metadata.
from app.modules.admins.models import Admin  # noqa: F401
from app.modules.audit.models import AuditLog  # noqa: F401
from app.modules.banners.models import Banner  # noqa: F401
from app.modules.cart.models import CustomerCartItem  # noqa: F401
from app.modules.contact.models import ContactMessage  # noqa: F401
from app.modules.custom_products.models import CustomCategory, CustomProduct  # noqa: F401
from app.modules.customers.models import Customer  # noqa: F401
from app.modules.delivery_zones.models import DeliveryZone  # noqa: F401
from app.modules.categories.models import HomepageCategory  # noqa: F401
from app.modules.offers.models import Offer  # noqa: F401
from app.modules.orders.models import Order  # noqa: F401
from app.modules.products.models import Category, Collection, Product, ProductGender, ProductVariant  # noqa: F401
from app.modules.settings.models import (  # noqa: F401
    AdminSecurity,
    NotificationSetting,
    PaymentMethod,
    StoreSettings,
)
from app.modules.coupons.models import Coupon, CouponUsage  # noqa: F401
from app.modules.notifications.models import AdminNotification  # noqa: F401
from app.modules.wishlist.models import CustomerWishlistItem  # noqa: F401

