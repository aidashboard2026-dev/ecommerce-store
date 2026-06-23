# Import all models here so they are registered with Base.metadata
# This ensures create_all() picks up every table.
from app.models.admin import Admin  # noqa: F401
from app.models.customer import Customer  # noqa: F401
from app.models.product import Category, Collection, Product, ProductVariant  # noqa: F401
from app.models.custom_product import CustomProduct
from app.models.order import Order  # noqa: F401
from app.models.offer import Offer  # noqa: F401
from app.models.banner import Banner  # noqa: F401
from app.models.delivery_zone import DeliveryZone  # noqa: F401