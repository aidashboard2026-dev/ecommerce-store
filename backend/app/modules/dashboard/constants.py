"""
app/modules/dashboard/constants.py

Dashboard analytics constants — extracted from the router where they lived
alongside SQL queries and business logic.
"""

# ── Order status filters ──────────────────────────────────────────────────────
# Uppercase — matches database values directly; no func.lower() needed.

# Orders that count toward "active sales" in the stats widget
ACTIVE_SALES_STATUSES = ("PLACED", "PROCESSING", "SHIPPED", "DELIVERED")

# Only DELIVERED + PAID orders count as realised revenue
REVENUE_STATUS  = "DELIVERED"
REVENUE_PAYMENT = "PAID"

# ── Payment method groupings ──────────────────────────────────────────────────
CASH_PAYMENT_METHODS = ("COD", "CASH", "CASH ON DELIVERY")
UPI_PAYMENT_METHODS  = ("UPI", "ONLINE", "RAZORPAY")

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
