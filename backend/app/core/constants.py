# Upload
MAX_IMAGE_SIZE = 10 * 1024 * 1024
ALLOWED_IMAGE_EXTENSIONS = {
    "jpg",
    "jpeg",
    "png",
    "webp",
}

# ── Standard Product Domain ────────────────────────────────────────────────────

DEFAULT_PRODUCT_CATEGORIES = [
    "T-Shirt",
    "Shirt",
    "Track Pant",
    "Jersey",
    "Trouser",
]

DEFAULT_COLLECTIONS = [
    "Men",
    "Women",
    "Kids",
]

PROTECTED_PRODUCT_CATEGORIES = [
    "T-Shirt",
    "Shirt",
    "Track Pant",
    "Jersey",
    "Trouser",
]

PROTECTED_COLLECTIONS = [
    "Men",
    "Women",
    "Kids",
]

# Category
MAX_CATEGORIES = 5

# Collections
MAX_COLLECTIONS = 3

# Sub Collections
MAX_SUB_COLLECTIONS = 10

# ── Custom Printing Domain ─────────────────────────────────────────────────────

# Custom Categories (Custom Printing has its own independent limit)
MAX_CUSTOM_CATEGORIES = 15

# ── Operational Limits (shared behaviour: delete one to add another) ───────────

# Banner
MAX_BANNERS = 5

# Offers
MAX_OFFERS = 5

# Product
MAX_PRODUCT_IMAGES = 7
MAX_PRODUCT_VARIANTS = 20
MAX_SIZES = 5
MAX_COLORS = 6


# Name Validation
MIN_PRODUCT_NAME_LENGTH = 3
MAX_PRODUCT_NAME_LENGTH = 150

MIN_CATEGORY_NAME_LENGTH = 2
MAX_CATEGORY_NAME_LENGTH = 50

MIN_COLLECTION_NAME_LENGTH = 2
MAX_COLLECTION_NAME_LENGTH = 50

MIN_SUB_COLLECTION_NAME_LENGTH = 2
MAX_SUB_COLLECTION_NAME_LENGTH = 50

MIN_BANNER_TITLE_LENGTH = 3
MAX_BANNER_TITLE_LENGTH = 100

MIN_OFFER_TITLE_LENGTH = 3
MAX_OFFER_TITLE_LENGTH = 100

MAX_PRODUCT_DESCRIPTION_LENGTH = 5000

# Price
MIN_PRODUCT_PRICE = 1
MAX_PRODUCT_PRICE = 100000

MIN_DISCOUNT_PERCENT = 0
MAX_DISCOUNT_PERCENT = 90

# Inventory
MIN_STOCK = 0
MAX_STOCK = 1000

MAX_SKU_LENGTH = 20
