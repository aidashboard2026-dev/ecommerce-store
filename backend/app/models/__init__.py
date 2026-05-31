# Import all models here so they are registered with Base.metadata
# This ensures create_all() picks up every table.
from app.models.admin import Admin  # noqa: F401
from app.models.product import Product, ProductVariant  # noqa: F401
