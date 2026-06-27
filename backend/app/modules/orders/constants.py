"""
app/modules/orders/constants.py

Order domain constants — single source of truth, never duplicated.
"""

from __future__ import annotations

# ─────────────────────────────────────────────────────────────
# Item type — the ONLY place Products and Custom Products meet
# ─────────────────────────────────────────────────────────────

class ItemType:
    PRODUCT        = "PRODUCT"
    CUSTOM_PRODUCT = "CUSTOM_PRODUCT"

    ALL = {PRODUCT, CUSTOM_PRODUCT}


# ─────────────────────────────────────────────────────────────
# Tracking status values
# ─────────────────────────────────────────────────────────────

class TrackingStatus:
    PLACED     = "PLACED"
    CONFIRMED  = "CONFIRMED"
    PROCESSING = "PROCESSING"
    SHIPPED    = "SHIPPED"
    OUT_FOR_DELIVERY = "OUT_FOR_DELIVERY"
    DELIVERED  = "DELIVERED"
    CANCELLED  = "CANCELLED"
    RETURNED   = "RETURNED"

    # Statuses after which customer-initiated cancellation is blocked
    NON_CANCELLABLE = {SHIPPED, DELIVERED}

    ALL = {
        PLACED, CONFIRMED, PROCESSING, SHIPPED,
        OUT_FOR_DELIVERY, DELIVERED, CANCELLED, RETURNED,
    }


# ─────────────────────────────────────────────────────────────
# Payment status values
# ─────────────────────────────────────────────────────────────

class PaymentStatus:
    PENDING  = "PENDING"
    PAID     = "PAID"
    FAILED   = "FAILED"
    REFUNDED = "REFUNDED"


# ─────────────────────────────────────────────────────────────
# Delivery estimation — Tamil Nadu city delivery day map
#
# Previously duplicated in create_order and create_customer_order.
# Single authoritative source here.
# ─────────────────────────────────────────────────────────────

DELIVERY_DAYS_MAP: dict[str, int] = {
    "Chennai":         3,
    "Coimbatore":      4,
    "Salem":           5,
    "Madurai":         6,
    "Trichy":          4,
    "Erode":           4,
    "Tiruppur":        4,
    "Vellore":         5,
    "Thanjavur":       5,
    "Tirunelveli":     7,
    "Thoothukudi":     7,
    "Dindigul":        5,
    "Namakkal":        4,
    "Karur":           4,
    "Kanchipuram":     3,
    "Cuddalore":       5,
    "Nagapattinam":    6,
    "Ramanathapuram":  7,
    "Sivagangai":      6,
    "Virudhunagar":    6,
    "Kanyakumari":     7,
    "Dharmapuri":      5,
    "Krishnagiri":     5,
    "Ariyalur":        5,
    "Perambalur":      5,
    "Pudukkottai":     6,
    "Nilgiris":        6,
    "Tenkasi":         7,
    "Ranipet":         4,
    "Tirupathur":      5,
    "Mayiladuthurai":  6,
}

DEFAULT_DELIVERY_DAYS = 5


# ─────────────────────────────────────────────────────────────
# Pagination defaults
# ─────────────────────────────────────────────────────────────

DEFAULT_PAGE_SIZE = 25
MAX_PAGE_SIZE     = 100
