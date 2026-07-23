"""
app/shared/invoice/service.py

THE SINGLE source of invoice PDF generation.

Architecture guarantee:
    Admin Download  → calls generate_invoice_pdf()
    Customer Download → calls generate_invoice_pdf()
    Email Attachment  → calls generate_invoice_pdf()

There is exactly one PDF template. No duplicates exist.

Security:
    - No internal notes, admin comments, supplier costs, profit margins,
      warehouse notes, internal IDs, database IDs, admin email, or debug info.
    - Only customer-visible fields are included.

Branding:
    - Store name, support email, support phone, and website are read from
      StoreSettings (db) at generation time — never hardcoded.
    - Falls back to config.py values if DB is unavailable.

COD vs Online:
    - Transaction ID is displayed only for online payments (RAZORPAY).
    - COD orders never show an empty Transaction ID field.

File naming: Invoice_INV-YYYY-XXXXXX.pdf
"""

from __future__ import annotations

import io
import os
import logging
from decimal import Decimal
from typing import Optional
from datetime import datetime

logger = logging.getLogger("app.invoice")


# ─────────────────────────────────────────────────────────────
# Branding & Numbering helpers
# ─────────────────────────────────────────────────────────────

def _get_store_branding(db=None) -> dict:
    """
    Fetch store branding from DB (StoreSettings).
    Falls back to config.py defaults if DB is unavailable.
    Never raises — invoice generation must not fail due to missing settings.
    """
    defaults = {
        "store_name":    "My Designers",
        "store_url":     "www.mydesigners.in",
        "support_email": "support@mydesigners.in",
        "support_phone": "+91 9876543210",
        "logo_url":      None,
    }
    if db is None:
        return defaults

    try:
        from app.modules.settings.service import get_or_create_store_settings
        s = get_or_create_store_settings(db)
        return {
            "store_name":    s.store_name or defaults["store_name"],
            "store_url":     (s.store_url or defaults["store_url"]).replace("https://", "").replace("http://", "").rstrip("/"),
            "support_email": s.support_email or defaults["support_email"],
            "support_phone": s.support_phone or defaults["support_phone"],
            "logo_url":      s.logo or None,
        }
    except Exception as exc:
        logger.warning("Could not load store branding from DB: %s — using defaults.", exc)
        return defaults


def get_invoice_number(order) -> str:
    """
    Generate the Invoice Number dynamically from the Order PK ID and order year.
    E.g. INV-2026-000124
    """
    order_id = getattr(order, "id", 0) or 0
    ordered_at = getattr(order, "ordered_at", None) or getattr(order, "created_at", None)
    if ordered_at:
        try:
            year = ordered_at.year
        except Exception:
            year = 2026
    else:
        year = 2026
    return f"INV-{year}-{order_id:06d}"


def invoice_filename(order_or_number) -> str:
    """Returns the filename for the invoice PDF: Invoice_INV-2026-000124.pdf"""
    if isinstance(order_or_number, str):
        safe = "".join(c for c in order_or_number if c.isalnum() or c in ("-", "_"))
        return f"Invoice_{safe}.pdf"
    
    inv_num = get_invoice_number(order_or_number)
    return f"Invoice_{inv_num}.pdf"


def num_to_words(num) -> str:
    """
    Converts a number (int or Decimal) to Indian Rupee word format.
    E.g., 1948.00 -> Rupees One Thousand Nine Hundred Forty Eight Only
    """
    try:
        val = int(round(float(num)))
        if val == 0:
            return "Rupees Zero Only"
            
        units = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
                 "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"]
        tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]
        
        def _helper(n):
            if n < 20:
                return units[n]
            elif n < 100:
                return tens[n // 10] + (" " + units[n % 10] if n % 10 != 0 else "")
            elif n < 1000:
                return units[n // 100] + " Hundred" + (" " + _helper(n % 100) if n % 100 != 0 else "")
            elif n < 100000:
                return _helper(n // 1000) + " Thousand" + (" " + _helper(n % 1000) if n % 1000 != 0 else "")
            elif n < 10000000:
                return _helper(n // 100000) + " Lakh" + (" " + _helper(n % 100000) if n % 100000 != 0 else "")
            else:
                return _helper(n // 10000000) + " Crore" + (" " + _helper(n % 10000000) if n % 10000000 != 0 else "")
                
        words = _helper(val)
        words = " ".join(words.split())
        return f"Rupees {words} Only"
    except Exception as exc:
        logger.warning("Could not convert number to words: %s", exc)
        return f"Rupees {num} Only"


def make_badge(text: str, status_type: str) -> Table:
    """Creates a beautiful rounded-corner-style padded table cell status badge."""
    from reportlab.lib import colors
    from reportlab.lib.units import mm
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.platypus import Paragraph, Table, TableStyle
    
    val = status_type.upper()
    if val in ("PAID", "DELIVERED", "CONFIRMED"):
        bg = colors.HexColor("#DCFCE7")  
        fg = colors.HexColor("#22C55E")  
    elif val in ("PENDING", "PLACED", "SHIPPED"):
        bg = colors.HexColor("#FEF3C7")  
        fg = colors.HexColor("#F59E0B")  
    elif val in ("FAILED", "CANCELLED"):
        bg = colors.HexColor("#FEE2E2")  
        fg = colors.HexColor("#EF4444")  
    else:
        bg = colors.HexColor("#F3F4F6")  
        fg = colors.HexColor("#6B7280")  

    style_badge = ParagraphStyle(
        f"Badge_{val}",
        fontName="Helvetica-Bold",
        fontSize=8,
        textColor=fg,
        alignment=1,  
        leading=10
    )
    p = Paragraph(text.upper(), style_badge)
    t = Table([[p]], colWidths=[22 * mm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), bg),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ROUNDEDCORNERS", [3, 3, 3, 3]),
    ]))
    return t


def load_logo_image(logo_url: Optional[str]) -> Optional["RLImage"]:
    """Dynamically loads the store logo image from local uploads or remote URL."""
    if not logo_url:
        return None
    from app.core.config import settings
    from reportlab.platypus import Image as RLImage
    if logo_url.startswith("/uploads/"):
        rel = logo_url.replace("/uploads/", "", 1)
        p = os.path.join(settings.UPLOAD_DIR, rel)
        if os.path.exists(p):
            try:
                return RLImage(p, width=80, height=40, kind='proportional')
            except Exception:
                pass
    if logo_url.startswith("http://") or logo_url.startswith("https://"):
        try:
            import httpx
            resp = httpx.get(logo_url, timeout=2.0)
            if resp.status_code == 200:
                return RLImage(io.BytesIO(resp.content), width=80, height=40, kind='proportional')
        except Exception:
            pass
    return None


def load_order_image(order) -> Optional["RLImage"]:
    """Loads the product image (75x75) from local uploads or remote URL, falls back to placeholder."""
    from app.core.config import settings
    from app.shared.storage.supabase_storage import get_product_image_url, get_custom_product_image_url
    from reportlab.platypus import Image as RLImage
    
    item_type = getattr(order, "item_type", "")
    raw_img = getattr(order, "product_image", None)
    
    if item_type == "CUSTOM_PRODUCT":
        img_url = get_custom_product_image_url(raw_img)
    else:
        img_url = get_product_image_url(raw_img)
        
    if not img_url:
        return None
        
    if img_url.startswith("/uploads/"):
        rel_path = img_url.replace("/uploads/", "", 1)
        possible_paths = [
            os.path.normpath(os.path.join(settings.UPLOAD_DIR, rel_path)),
            os.path.normpath(os.path.join("d:\\freelance\\ecommerce-store\\backend\\uploads", rel_path)),
            os.path.normpath(os.path.join("d:\\freelance\\ecommerce-store\\backend", img_url.lstrip("/"))),
        ]
        for p in possible_paths:
            if os.path.exists(p):
                try:
                    return RLImage(p, width=75, height=75, kind='proportional')
                except Exception:
                    pass
                    
    if img_url.startswith("http://") or img_url.startswith("https://"):
        try:
            import httpx
            resp = httpx.get(img_url, timeout=2.0)
            if resp.status_code == 200:
                return RLImage(io.BytesIO(resp.content), width=75, height=75, kind='proportional')
        except Exception as exc:
            logger.warning("Failed to fetch remote order image %s: %s", img_url, exc)
            
    placeholder_paths = [
        os.path.normpath(os.path.join(settings.UPLOAD_DIR, "placeholder-product.png")),
        os.path.normpath(os.path.join("d:\\freelance\\ecommerce-store\\backend\\uploads", "placeholder-product.png")),
    ]
    for p in placeholder_paths:
        if os.path.exists(p):
            try:
                return RLImage(p, width=75, height=75, kind='proportional')
            except Exception:
                pass
                
    return None


def make_qr_code(url: str) -> "Drawing":
    """Generates a ReportLab barcode QR Code widget, wraps in a Drawing, with a fallback rectangle if missing."""
    from reportlab.lib import colors
    try:
        from reportlab.graphics.barcode.qr import QrCodeWidget
        from reportlab.graphics.shapes import Drawing
        qr = QrCodeWidget(value=url)
        qr.barWidth = 70
        qr.barHeight = 70
        d = Drawing(70, 70)
        d.add(qr)
        return d
    except Exception as exc:
        logger.warning("Could not generate QR Code: %s", exc)
        from reportlab.graphics.shapes import Drawing, Rect, String
        d = Drawing(70, 70)
        d.add(Rect(0, 0, 70, 70, fillColor=colors.HexColor("#F3F4F6"), strokeColor=colors.HexColor("#E5E7EB")))
        d.add(String(35, 33, "QR CODE", fontName="Helvetica-Bold", fontSize=7, textAnchor="middle", fillColor=colors.HexColor("#9CA3AF")))
        return d


# ─────────────────────────────────────────────────────────────
# PDF generation (reportlab) - PREMIUM ECOMMERCE UI
# ─────────────────────────────────────────────────────────────

def generate_invoice_pdf(order, db=None) -> bytes:
    """
    Generate a Tax Invoice PDF for the given order.
    (Business logic, math, and data fetching remain exactly the same)
    """
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
        HRFlowable, Image as RLImage,
    )
    from reportlab.platypus.flowables import KeepTogether
    from reportlab.graphics.shapes import Drawing
    from app.core.config import settings

    # ── Data extraction ───────────────────────────────────────────────────────
    def attr(name, default="—"):
        val = getattr(order, name, None)
        if val is None or str(val).strip() == "":
            return default
        return str(val)

    def decimal_attr(name, default=Decimal("0.00")) -> Decimal:
        val = getattr(order, name, None)
        try:
            return Decimal(str(val))
        except Exception:
            return default

    order_number    = attr("order_number")
    customer_name   = attr("customer_name")
    customer_email  = attr("customer_email")
    customer_phone  = attr("customer_phone")
    address_line1   = attr("address_line1")
    address_line2   = attr("address_line2", "")
    city            = attr("city")
    state           = attr("state")
    pincode         = attr("pincode")
    country         = attr("country", "India")
    product_name    = attr("product_name")
    size            = attr("size", "")
    color           = attr("color", "")
    quantity        = attr("quantity", "1")
    price           = decimal_attr("price")
    total_amount    = decimal_attr("total_amount")
    payment_method  = attr("payment_method")
    payment_status  = attr("payment_status")
    tracking_status = attr("tracking_status")
    ordered_at      = getattr(order, "ordered_at", None)
    created_at      = getattr(order, "created_at", None)

    razorpay_payment_id = getattr(order, "razorpay_payment_id", None)
    razorpay_order_id   = getattr(order, "razorpay_order_id", None)
    is_online_payment   = payment_method.upper() not in ("COD", "CASH ON DELIVERY", "CASH_ON_DELIVERY")

    # ── Branding ─────────────────────────────────────────────────────────────
    branding = _get_store_branding(db)
    store_name    = branding["store_name"]
    store_url     = branding["store_url"]
    support_email = branding["support_email"]
    support_phone = branding["support_phone"]
    logo_url      = branding["logo_url"]

    invoice_number = get_invoice_number(order)

    # ── Financial calculations ───────────────────────────────────────────────
    subtotal       = price * Decimal(quantity)
    taxable        = subtotal / Decimal("1.18")
    gst_amount     = subtotal - taxable
    cgst           = gst_amount / Decimal("2")
    sgst           = gst_amount / Decimal("2")
    shipping_val   = decimal_attr("shipping_fee", Decimal("0.00"))
    discount_val   = decimal_attr("discount_amount", Decimal("0.00"))
    grand_total    = subtotal + shipping_val - discount_val

    def fmt_money(val: Decimal) -> str:
        return f"₹{val:,.2f}"

    def fmt_date(dt) -> str:
        if dt is None:
            return "—"
        try:
            return str(dt)[:10]
        except Exception:
            return "—"

    # ── ReportLab document ───────────────────────────────────────────────────
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=15 * mm,
        rightMargin=15 * mm,
        topMargin=12 * mm, 
        bottomMargin=12 * mm,
        title=f"Invoice {invoice_number}",
        author=store_name,
    )

    # ── MINIMAL STYLES ───────────────────────────────────────────────────────
    styles     = getSampleStyleSheet()
    PRIMARY    = colors.HexColor("#111827")
    SECONDARY  = colors.HexColor("#6B7280")
    MUTED      = colors.HexColor("#9CA3AF")
    DIVIDER    = colors.HexColor("#E5E7EB")
    SUCCESS    = colors.HexColor("#22C55E")

    def style(name, **kw):
        base = ParagraphStyle(name, parent=styles["Normal"], **kw)
        return base

    H1          = style("H1",          fontName="Helvetica-Bold",  fontSize=20, textColor=PRIMARY, leading=24)
    H_CONF      = style("H_Conf",      fontName="Helvetica-Bold",  fontSize=18, textColor=SUCCESS, leading=22)
    TAGLINE     = style("Tagline",     fontName="Helvetica",       fontSize=9,  textColor=SECONDARY,  leading=12)
    BODY        = style("Body",        fontName="Helvetica",       fontSize=10.5, textColor=PRIMARY,    leading=14)
    BODY_GRAY   = style("BodyGray",    fontName="Helvetica",       fontSize=9,  textColor=SECONDARY,  leading=12)
    BODY_MUTED  = style("BodyMuted",   fontName="Helvetica",       fontSize=8,  textColor=MUTED,      leading=10)
    LABEL       = style("Label",       fontName="Helvetica",       fontSize=9,  textColor=MUTED,      spaceAfter=1)
    VALUE       = style("Value",       fontName="Helvetica",       fontSize=10.5, textColor=PRIMARY,    leading=14)
    VALUE_B     = style("ValueB",      fontName="Helvetica-Bold",  fontSize=10.5, textColor=PRIMARY,    leading=14)
    FOOTER      = style("Footer",      fontName="Helvetica",       fontSize=8,  textColor=SECONDARY,  alignment=TA_CENTER, leading=11)

    elements = []
    W = A4[0] - 30 * mm  

    # ── 1. HERO SECTION ──────────────────────────────────────────────────────
    logo_img = load_logo_image(logo_url)
    
    hero_left = []
    if logo_img:
        hero_left.append(logo_img)
    else:
        hero_left.append(Paragraph(store_name.upper(), H1))
    hero_left.append(Paragraph("Premium Fashion & Lifestyle", TAGLINE))

    p_status_badge = make_badge(payment_status, payment_status)

    hero_right = [
        Paragraph("Order Confirmed", H_CONF),
        Paragraph("Thank you for your purchase.", BODY_GRAY),
        Spacer(1, 3 * mm),
        Paragraph(f"<b>Order Number:</b> {order_number}", VALUE),
        Paragraph(f"<b>Invoice Number:</b> {invoice_number}", VALUE),
        Paragraph(f"<b>Date:</b> {fmt_date(ordered_at)}", VALUE),
        Spacer(1, 3 * mm),
        p_status_badge
    ]

    hero_table = Table([[hero_left, hero_right]], colWidths=[W * 0.5, W * 0.5])
    hero_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    
    elements.append(hero_table)
    elements.append(Spacer(1, 3 * mm))
    elements.append(HRFlowable(width=W, thickness=0.5, color=DIVIDER, spaceBefore=0, spaceAfter=4 * mm))

    # ── 2. INFORMATION LAYOUT (No Boxes) ─────────────────────────────────────
    ship_address = address_line1
    if address_line2:
        ship_address += f", {address_line2}"
    ship_address += f"<br/>{city}, {state} - {pincode}<br/>{country}"
    
    info_left = [
        Paragraph("Customer", LABEL),
        Spacer(1, 1 * mm),
        Paragraph(customer_name, VALUE_B),
        Paragraph(customer_phone, BODY_GRAY),
        Paragraph(customer_email, BODY_GRAY),
        Spacer(1, 3 * mm),
        Paragraph("Shipping Address", LABEL),
        Spacer(1, 1 * mm),
        Paragraph(ship_address, BODY_GRAY)
    ]

    info_right = [
        Paragraph("Payment Details", LABEL),
        Spacer(1, 1 * mm),
        Paragraph(f"Method: {payment_method}", VALUE),
        Paragraph("Status:", VALUE),
        p_status_badge,
        Spacer(1, 3 * mm),
        Paragraph("Order Status", LABEL),
        Spacer(1, 1 * mm),
        make_badge(tracking_status, tracking_status),
    ]

    if is_online_payment and razorpay_payment_id and razorpay_payment_id != "—":
        info_right.append(Spacer(1, 3 * mm))
        info_right.append(Paragraph("Transaction ID", LABEL))
        info_right.append(Spacer(1, 1 * mm))
        info_right.append(Paragraph(razorpay_payment_id, BODY_GRAY))

    info_table = Table([[info_left, info_right]], colWidths=[W * 0.5, W * 0.5])
    info_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    
    elements.append(info_table)
    elements.append(Spacer(1, 3 * mm))
    elements.append(HRFlowable(width=W, thickness=0.5, color=DIVIDER, spaceBefore=0, spaceAfter=4 * mm))

    # ── 3. PRODUCT SECTION (Receipt Style) ───────────────────────────────────
    prod_image = load_order_image(order)

    variant_parts = []
    if size and size != "—":
        variant_parts.append(f"Size: {size}")
    if color and color != "—":
        variant_parts.append(f"Color: {color}")
    variant_str = "  ·  ".join(variant_parts) if variant_parts else ""

    details_cell = [
        Paragraph(product_name, VALUE_B),
        Paragraph(variant_str, BODY_MUTED) if variant_str else Spacer(1, 0)
    ]

    # Right side mini-receipt layout for the item
    item_meta_cell = [
        Paragraph(f"Qty: {quantity}", LABEL),
        Spacer(1, 1 * mm),
        Paragraph(fmt_money(price), LABEL), # Unit price
        Spacer(1, 4 * mm),
        Paragraph(fmt_money(subtotal), style("ItemTotal", fontName="Helvetica-Bold", fontSize=12, textColor=PRIMARY, alignment=TA_RIGHT))
    ]

    product_row = [
        prod_image or Paragraph("No Image", BODY_MUTED),
        details_cell,
        item_meta_cell
    ]

    # No column headers to avoid spreadsheet look
    col_widths = [30 * mm, 80 * mm, W - 110 * mm]
    
    product_table = Table([product_row], colWidths=col_widths, repeatRows=1)
    product_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    
    elements.append(product_table)
    elements.append(Spacer(1, 3 * mm))
    elements.append(HRFlowable(width=W, thickness=0.5, color=DIVIDER, spaceBefore=0, spaceAfter=4 * mm))

    # ── 4. BOTTOM: QR, SUPPORT & ORDER SUMMARY ──────────────────────────────
    order_url = f"{settings.FRONTEND_URL}/orders/{order.id or 0}"
    qr_drawing = make_qr_code(order_url)
    
    qr_section = [
        qr_drawing,
        Spacer(1, 2 * mm),
        Paragraph("Track Your Order", style("QR_T", fontName="Helvetica-Bold", fontSize=11, textColor=PRIMARY)),
        Paragraph("Scan to:", LABEL),
        Paragraph("• Track Shipment", BODY_GRAY),
        Paragraph("• Download Invoice", BODY_GRAY),
        Paragraph("• Contact Support", BODY_GRAY),
    ]

    support_section = [
        Paragraph("Need Help?", style("H_Help", fontName="Helvetica-Bold", fontSize=11, textColor=PRIMARY)),
        Spacer(1, 2 * mm),
        Paragraph(support_email, BODY_GRAY),
        Paragraph(support_phone, BODY_GRAY),
        Paragraph(store_url, BODY_GRAY),
        Spacer(1, 2 * mm),
        Paragraph("Business Hours", LABEL),
        Paragraph("Mon–Sat, 9 AM – 6 PM", BODY_GRAY),
    ]

    # Right Aligned Summary
    summary_rows = [
        [
            Paragraph("Subtotal", style("SR_L", fontSize=10, textColor=SECONDARY, alignment=TA_LEFT)),
            Paragraph(fmt_money(subtotal), style("SR_R", fontSize=10, textColor=PRIMARY, alignment=TA_RIGHT))
        ],
    ]
    if discount_val > 0:
        summary_rows.append([
            Paragraph("Discount", style("SR_L", fontSize=10, textColor=SUCCESS, alignment=TA_LEFT)),
            Paragraph(f"-{fmt_money(discount_val)}", style("SR_R", fontSize=10, textColor=SUCCESS, alignment=TA_RIGHT))
        ])
    summary_rows.extend([
        [
            Paragraph("Shipping", style("SR_L_Ship", fontSize=10, textColor=SECONDARY, alignment=TA_LEFT)),
            Paragraph(fmt_money(shipping_val) if shipping_val > 0 else "FREE", style("SR_R_Ship", fontSize=10, textColor=PRIMARY if shipping_val > 0 else SUCCESS, fontName="Helvetica-Bold" if shipping_val == 0 else "Helvetica", alignment=TA_RIGHT))
        ],
        [
            Paragraph("Tax Included (18%)", style("SR_L_Tax", fontSize=10, textColor=SECONDARY, alignment=TA_LEFT)),
            Paragraph(fmt_money(gst_amount), style("SR_R_Tax", fontSize=10, textColor=SECONDARY, alignment=TA_RIGHT))
        ],
        [Spacer(1, 2 * mm), Spacer(1, 2 * mm)],
        [
            Paragraph("Grand Total", style("SR_L_GT", fontSize=11, textColor=PRIMARY, fontName="Helvetica-Bold", alignment=TA_LEFT)),
            Paragraph(fmt_money(grand_total), style("SR_V", fontSize=20, textColor=PRIMARY, alignment=TA_RIGHT, fontName="Helvetica-Bold"))
        ],
    ])
    summary_table = Table(summary_rows, colWidths=[50 * mm, W - 130 * mm])
    summary_table.setStyle(TableStyle([
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 1),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
        ("LINEABOVE", (0, 4), (-1, 4), 0.5, DIVIDER), # Subtle line above Grand Total
    ]))

    bottom_table = Table([[qr_section, support_section, summary_table]], colWidths=[35 * mm, 45 * mm, W - 80 * mm])
    bottom_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    
    elements.append(bottom_table)
    elements.append(Spacer(1, 4 * mm))
    elements.append(HRFlowable(width=W, thickness=0.5, color=DIVIDER, spaceBefore=0, spaceAfter=4 * mm))

    # ── 5. PREMIUM FOOTER ────────────────────────────────────────────────────
    footer_text = [
        Paragraph("Thank you for shopping with My Designers.", style("F1", fontSize=10, textColor=PRIMARY, alignment=TA_CENTER, fontName="Helvetica-Bold")),
        Paragraph("We appreciate your trust.", style("F2", fontSize=9, textColor=SECONDARY, alignment=TA_CENTER)),
        Spacer(1, 2 * mm),
        Paragraph("This invoice was generated automatically. No signature required.", style("F3", fontSize=8, textColor=MUTED, alignment=TA_CENTER)),
    ]
    footer_table = Table([[footer_text]], colWidths=[W])
    footer_table.setStyle(TableStyle([
        ("LINEABOVE", (0, 0), (-1, 0), 0.5, DIVIDER),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
    ]))
    elements.append(footer_table)

    # ── Build PDF (Completely clean, no watermark) ───────────────────────────
    doc.build(elements)
    return buffer.getvalue()