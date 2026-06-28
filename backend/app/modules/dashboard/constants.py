"""
app/modules/dashboard/constants.py

Dashboard analytics constants — extracted from the router where they lived
alongside SQL queries and business logic.
"""

# ── Order status filters ──────────────────────────────────────────────────────
# Lowercase — compared using func.lower() in queries.

# Orders that count toward "active sales" in the stats widget
ACTIVE_SALES_STATUSES = ("placed", "pending", "processing", "shipped", "delivered")

# Only DELIVERED + PAID orders count as realised revenue
REVENUE_STATUS  = "delivered"
REVENUE_PAYMENT = "paid"

# ── Payment method groupings ──────────────────────────────────────────────────
CASH_PAYMENT_METHODS = ("cod", "cash", "cash on delivery")
UPI_PAYMENT_METHODS  = ("paid", "upi", "online", "razorpay")

# ── Chart labels ──────────────────────────────────────────────────────────────
WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

# ── Limits ────────────────────────────────────────────────────────────────────
TOP_CATEGORIES_LIMIT  = 5
LOW_STOCK_LIMIT       = 3
RECENT_ORDERS_LIMIT   = 5
RECENT_PRODUCTS_LIMIT = 3
RECENT_ACTIVITY_LIMIT = 10

# ── Growth window (days) ──────────────────────────────────────────────────────
GROWTH_WINDOW_DAYS = 30
