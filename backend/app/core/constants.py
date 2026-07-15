# ==============================================================================
# Upload Configuration
# ==============================================================================

MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10 MB


ALLOWED_IMAGE_EXTENSIONS = {
    "jpg",
    "jpeg",
    "png",
    "webp",
}


# ==============================================================================
# Business Limits
# ==============================================================================

# Product Catalog
MAX_CATEGORIES = 5
MAX_COLLECTIONS = 20
MAX_PRODUCTS = 100

# Homepage
MAX_HOMEPAGE_CATEGORIES = 4
MAX_BANNERS = 5
MAX_OFFERS = 5

# Custom Printing
MAX_CUSTOM_CATEGORIES = 20

# Product
MAX_PRODUCT_IMAGES = 8
MAX_PRODUCT_VARIANTS = 30


# ==============================================================================
# Product Validation
# ==============================================================================

MIN_PRODUCT_NAME_LENGTH = 3
MAX_PRODUCT_NAME_LENGTH = 150

MAX_PRODUCT_DESCRIPTION_LENGTH = 5000


# ==============================================================================
# Category Validation
# ==============================================================================

MIN_CATEGORY_NAME_LENGTH = 2
MAX_CATEGORY_NAME_LENGTH = 50

MIN_COLLECTION_NAME_LENGTH = 2
MAX_COLLECTION_NAME_LENGTH = 50


# ==============================================================================
# Banner Validation
# ==============================================================================

MIN_BANNER_TITLE_LENGTH = 3
MAX_BANNER_TITLE_LENGTH = 100


# ==============================================================================
# Offer Validation
# ==============================================================================

MIN_OFFER_TITLE_LENGTH = 3
MAX_OFFER_TITLE_LENGTH = 100


# ==============================================================================
# SKU Validation
# ==============================================================================

MIN_SKU_LENGTH = 3
MAX_SKU_LENGTH = 20


# ==============================================================================
# Pricing Constraints
# ==============================================================================

MIN_PRODUCT_PRICE = 1
MAX_PRODUCT_PRICE = 100000

MIN_DISCOUNT_PERCENT = 0
MAX_DISCOUNT_PERCENT = 90


# ==============================================================================
# Inventory Constraints
# ==============================================================================

MIN_STOCK = 0
MAX_STOCK = 10000


# ==============================================================================
# Pagination Defaults (Optional - use when needed)
# ==============================================================================

DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 100