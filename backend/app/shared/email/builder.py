"""
app/shared/email/builder.py

Pure presentation layer for generating e-commerce transactional and administrative email bodies.
This module has no database or environment configurations. It accepts all dynamic variables,
branding options, and order structures directly as parameters, rendering a Tuple of (HTML, Plain Text).
"""

from datetime import datetime
from typing import Tuple

# Design System Colors
# Primary Text: #111827
# Accent Color: #2563EB
# Success Alert: #16A34A
# Warning Alert: #EA580C
# Light Gray Background: #F9FAFB
# White Card Background: #FFFFFF
# Border/Divider: #E5E7EB
# Secondary Text: #374151
# Muted Text: #6B7280

def build_button_html(text: str, url: str) -> str:
    """
    Renders an email-client safe CTA button.
    Includes fallback text link below to ensure usability when CSS is stripped or images are blocked.
    """
    return f"""
    <div style="text-align: center; margin: 32px 0 16px 0;">
        <!--[if mso]>
        <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="{url}" style="height:48px;v-text-anchor:middle;width:200px;" arcsize="13%" stroke="f" fillcolor="#2563EB">
            <w:anchorlock/>
            <center style="color:#FFFFFF;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;">{text}</center>
        </v:roundrect>
        <![endif]-->
        <!--[if !mso]><!-->
        <a href="{url}" target="_blank" style="display: inline-block; background-color: #2563EB; color: #FFFFFF; font-family: Arial, Helvetica, sans-serif; font-size: 15px; font-weight: bold; text-decoration: none; padding: 14px 32px; border-radius: 6px; letter-spacing: 0.1px; -webkit-text-size-adjust: none;">{text}</a>
        <!--<![endif]-->
        <p style="margin: 12px 0 0 0; font-size: 12px; color: #6B7280; font-family: Arial, Helvetica, sans-serif; text-align: center; line-height: 1.4;">
            If the button above does not work, copy and paste this link into your web browser:<br/>
            <a href="{url}" target="_blank" style="color: #2563EB; text-decoration: underline; word-break: break-all;">{url}</a>
        </p>
    </div>
    """


def build_shared_footer_html(branding: dict, reference_id: str) -> str:
    """
    Builds the standardized email footer with dynamic values and graceful fallback degradation.
    """
    store_name = branding.get("store_name", "My Designers")
    logo_url = branding.get("store_logo")
    store_url = branding.get("store_url", "")
    support_email = branding.get("support_email", "")
    support_phone = branding.get("support_phone", "")
    business_address = branding.get("business_address")
    fb_url = branding.get("facebook_url")
    ig_url = branding.get("instagram_url")
    li_url = branding.get("linkedin_url")
    privacy_url = branding.get("privacy_policy_url")
    terms_url = branding.get("terms_url")
    current_year = branding.get("current_year", str(datetime.now().year))

    # Graceful degradation for Logo
    if logo_url:
        brand_block = f'<img src="{logo_url}" alt="{store_name}" width="120" height="30" style="display: block; margin: 0 auto; outline: none; border: none; height: auto; max-height: 28px; max-width: 120px;" />'
    else:
        brand_block = f'<p style="margin: 0; font-weight: bold; color: #111827; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">{store_name}</p>'

    # Social Links (hide if none)
    social_items = []
    if fb_url:
        social_items.append(f'<a href="{fb_url}" target="_blank" style="color: #6B7280; text-decoration: none; margin: 0 8px;">Facebook</a>')
    if ig_url:
        social_items.append(f'<a href="{ig_url}" target="_blank" style="color: #6B7280; text-decoration: none; margin: 0 8px;">Instagram</a>')
    if li_url:
        social_items.append(f'<a href="{li_url}" target="_blank" style="color: #6B7280; text-decoration: none; margin: 0 8px;">LinkedIn</a>')

    social_html = ""
    if social_items:
        social_str = " | ".join(social_items)
        social_html = f'<p style="margin: 12px 0 16px; font-size: 12px;">{social_str}</p>'

    # Business Address (hide if none)
    address_html = ""
    if business_address:
        address_html = f'<p style="margin: 0 0 12px; color: #6B7280; font-size: 12px;">{business_address}</p>'

    # Policy Links
    policy_items = []
    if privacy_url:
        policy_items.append(f'<a href="{privacy_url}" target="_blank" style="color: #9CA3AF; text-decoration: underline;">Privacy Policy</a>')
    if terms_url:
        policy_items.append(f'<a href="{terms_url}" target="_blank" style="color: #9CA3AF; text-decoration: underline;">Terms of Service</a>')
    
    policies_html = ""
    if policy_items:
        policies_str = " | ".join(policy_items)
        policies_html = f'<p style="margin: 0 0 16px; font-size: 11px; color: #9CA3AF;">{policies_str}</p>'

    # Support Block
    support_html = ""
    if support_email or support_phone:
        parts = []
        if support_email:
            parts.append(f'Email: <a href="mailto:{support_email}" style="color: #2563EB; text-decoration: none;">{support_email}</a>')
        if support_phone:
            parts.append(f'Phone: {support_phone}')
        support_html = f'<p style="margin: 0 0 12px; font-size: 12px; color: #6B7280;">{" | ".join(parts)}</p>'

    return f"""
          <!-- Footer -->
          <tr>
            <td class="email-footer" style="padding: 32px 40px; background-color: #F9FAFB; border-top: 1px solid #E5E7EB; text-align: center; color: #6B7280; font-size: 12px; line-height: 1.6;">
              {brand_block}
              {social_html}
              {address_html}
              {support_html}
              <p style="margin: 0 0 8px;">&copy; {current_year} {store_name}. All rights reserved.</p>
              {policies_html}
              <p style="margin: 16px 0 0; font-size: 11px; color: #9CA3AF; font-family: monospace; letter-spacing: 0.5px;">Reference ID: {reference_id}</p>
            </td>
          </tr>
    """


def build_shared_footer_text(branding: dict, reference_id: str) -> str:
    """
    Builds the plain-text alternative footer.
    """
    store_name = branding.get("store_name", "My Designers")
    store_url = branding.get("store_url", "")
    support_email = branding.get("support_email", "")
    support_phone = branding.get("support_phone", "")
    business_address = branding.get("business_address")
    current_year = branding.get("current_year", str(datetime.now().year))

    text = "\n" + "=" * 50 + "\n"
    if support_email or support_phone:
        text += f"Support - "
        if support_email:
            text += f"Email: {support_email} "
        if support_phone:
            text += f"Phone: {support_phone}"
        text += "\n"
    if store_url:
        text += f"Website: https://{store_url}\n"
    if business_address:
        text += f"Address: {business_address}\n"
    text += f"Copyright (c) {current_year} {store_name}. All rights reserved.\n"
    text += f"Reference ID: {reference_id}\n"
    text += "=" * 50 + "\n"
    return text


def wrap_in_design_system(branding: dict, content_html: str, title: str = "", tagline: str = "", action_button: dict = None, reference_id: str = "GEN-000000") -> str:
    """
    Encloses template body content in the core responsive layout.
    Features dark mode compatibility styles in the head.
    """
    store_name = branding.get("store_name", "My Designers")
    logo_url = branding.get("store_logo")
    
    # Graceful degradation for Header Logo
    if logo_url:
        logo_html = f'<img src="{logo_url}" alt="{store_name}" width="160" height="40" style="display: block; margin: 0 auto; outline: none; border: none; height: auto; max-height: 48px; max-width: 200px;" />'
    else:
        logo_html = f'<h1 style="margin: 0; color: #111827; font-family: Arial, Helvetica, sans-serif; font-size: 24px; font-weight: bold; letter-spacing: -0.5px; text-align: center;">{store_name}</h1>'

    tagline_html = ""
    if tagline:
        tagline_html = f'<p style="margin: 6px 0 0; color: #6B7280; font-family: Arial, Helvetica, sans-serif; font-size: 13px; text-align: center;">{tagline}</p>'

    button_html = ""
    if action_button and action_button.get("text") and action_button.get("url"):
        button_html = build_button_html(action_button["text"], action_button["url"])

    footer_html = build_shared_footer_html(branding, reference_id)

    return f"""<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <!--[if !mso]><!-->
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <!--<![endif]-->
  <title>{title or store_name}</title>
  <style>
    /* Dark Mode Settings */
    @media (prefers-color-scheme: dark) {{
      body {{
        background-color: #111827 !important;
      }}
      .email-wrapper {{
        background-color: #111827 !important;
      }}
      .email-card {{
        background-color: #1F2937 !important;
        border-color: #374151 !important;
      }}
      .email-header {{
        background-color: #1F2937 !important;
        border-bottom-color: #374151 !important;
      }}
      .email-body {{
        color: #E5E7EB !important;
      }}
      .email-footer {{
        background-color: #111827 !important;
        border-top-color: #374151 !important;
        color: #9CA3AF !important;
      }}
      h1, h2, h3, h4 {{
        color: #FFFFFF !important;
      }}
      .card-item {{
        background-color: #111827 !important;
        border-color: #374151 !important;
      }}
      .divider {{
        border-top-color: #374151 !important;
      }}
      .text-muted {{
        color: #9CA3AF !important;
      }}
    }}
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #F9FAFB; font-family: Arial, Helvetica, sans-serif; -webkit-font-smoothing: antialiased; width: 100% !important;">
  <table class="email-wrapper" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F9FAFB; padding: 40px 10px;">
    <tr>
      <td align="center">
        <!--[if mso]>
        <table align="center" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;">
        <tr>
        <td>
        <![endif]-->
        <table class="email-card" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #FFFFFF; border-radius: 12px; border: 1px solid #E5E7EB; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
          
          <!-- Header -->
          <tr>
            <td class="email-header" style="padding: 32px 40px; background-color: #FFFFFF; border-bottom: 1px solid #E5E7EB; text-align: center;">
              {logo_html}
              {tagline_html}
            </td>
          </tr>
          
          <!-- Content Body -->
          <tr>
            <td class="email-body" style="padding: 40px; text-align: left; font-size: 15px; line-height: 1.6; color: #374151;">
              {content_html}
              {button_html}
            </td>
          </tr>
          
          {footer_html}
          
        </table>
        <!--[if mso]>
        </td>
        </tr>
        </table>
        <![endif]-->
      </td>
    </tr>
  </table>
</body>
</html>
"""


# ── Template 1: Contact Us Auto Reply ────────────────────────────────────────

def build_contact_auto_reply(branding: dict, customer_name: str, submitted_subject: str, submitted_date: str, reference_id: str) -> Tuple[str, str]:
    """
    Renders (HTML, Plain Text) for Customer auto-reply confirmation.
    """
    store_name = branding.get("store_name", "My Designers")
    store_url = branding.get("store_url", "")
    
    html_content = f"""
    <h2 style="margin: 0 0 16px; color: #111827; font-size: 20px; font-weight: bold;">Hello {customer_name},</h2>
    <p style="margin: 0 0 16px;">We have received your message successfully. Thank you for reaching out to us!</p>
    
    <div class="card-item" style="background-color: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; padding: 20px; margin: 24px 0;">
      <h3 style="margin: 0 0 12px; color: #111827; font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">Message Details</h3>
      <p style="margin: 0 0 8px; font-size: 14px;"><strong>Subject:</strong> {submitted_subject}</p>
      <p style="margin: 0; font-size: 14px;"><strong>Submitted On:</strong> {submitted_date}</p>
    </div>
    
    <div style="border-left: 4px solid #2563EB; padding: 15px; margin: 24px 0;">
      <p style="margin: 0; font-size: 14px; color: #374151;"><strong>⏱️ What's Next?</strong></p>
      <p style="margin: 4px 0 0; font-size: 14px; color: #6B7280;" class="text-muted">Our dedicated support team will review your inquiry and respond within <strong>24 hours</strong>.</p>
    </div>
    
    <p style="margin: 0 0 16px;">In the meantime, feel free to visit our online store to explore our latest collections.</p>
    """
    
    html = wrap_in_design_system(
        branding=branding,
        content_html=html_content,
        title="Message Received",
        tagline="Thank you for contacting us",
        action_button={"text": "Visit Store", "url": f"https://{store_url}"},
        reference_id=reference_id
    )

    text = f"Hello {customer_name},\n\n" \
           f"We have received your message successfully. Thank you for reaching out to us!\n\n" \
           f"MESSAGE DETAILS:\n" \
           f"- Subject: {submitted_subject}\n" \
           f"- Date: {submitted_date}\n\n" \
           f"Our support team will review your inquiry and respond within 24 hours.\n\n" \
           f"Explore our online store: https://{store_url}" \
           + build_shared_footer_text(branding, reference_id)
           
    return html, text


# ── Template 2: Contact Us Admin Notification ────────────────────────────────

def build_contact_admin_notification(branding: dict, customer_name: str, customer_email: str, subject: str, message: str, submitted_date: str, submitted_time: str, reference_id: str) -> Tuple[str, str]:
    """
    Renders (HTML, Plain Text) for Admin warning of contact form submission.
    """
    html_content = f"""
    <h2 style="margin: 0 0 16px; color: #111827; font-size: 20px; font-weight: bold;">New Contact Form Submission</h2>
    <p style="margin: 0 0 24px;">A visitor has submitted a message via the Contact Us form on your website.</p>
    
    <div class="card-item" style="background-color: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 8px; padding: 20px; margin: 24px 0;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size: 14px; line-height: 1.5; color: #374151;">
        <tr>
          <td style="padding-bottom: 12px; border-bottom: 1px solid #E5E7EB;">
            <span class="text-muted" style="color: #6B7280; font-size: 11px; font-weight: bold; text-transform: uppercase;">From</span><br/>
            <strong>{customer_name}</strong> (&lt;<a href="mailto:{customer_email}" style="color: #2563EB; text-decoration: none;">{customer_email}</a>&gt;)
          </td>
        </tr>
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #E5E7EB;">
            <span class="text-muted" style="color: #6B7280; font-size: 11px; font-weight: bold; text-transform: uppercase;">Subject</span><br/>
            <strong>{subject}</strong>
          </td>
        </tr>
        <tr>
          <td style="padding-top: 12px;">
            <span class="text-muted" style="color: #6B7280; font-size: 11px; font-weight: bold; text-transform: uppercase;">Message</span><br/>
            <div class="card-item" style="margin-top: 6px; padding: 12px; background-color: #F9FAFB; border-radius: 6px; border: 1px solid #E5E7EB; white-space: pre-wrap; font-family: monospace; font-size: 13.5px; color: #374151;">{message}</div>
          </td>
        </tr>
      </table>
    </div>
    
    <p style="margin: 0; font-size: 13px; color: #6B7280;" class="text-muted">Submitted on {submitted_date} at {submitted_time}.</p>
    """
    
    admin_reply_url = f"mailto:{customer_email}?subject=Re:%20{subject}"
    html = wrap_in_design_system(
        branding=branding,
        content_html=html_content,
        title="New Form Submission",
        tagline="Admin Notification Panel",
        action_button={"text": "Reply Directly", "url": admin_reply_url},
        reference_id=reference_id
    )

    text = f"New Contact Form Submission Alert\n" \
           f"From: {customer_name} ({customer_email})\n" \
           f"Subject: {subject}\n" \
           f"Date: {submitted_date} at {submitted_time}\n\n" \
           f"MESSAGE:\n{message}\n\n" \
           f"Reply URL: {admin_reply_url}" \
           + build_shared_footer_text(branding, reference_id)

    return html, text


# ── Template 3: Admin Reply ──────────────────────────────────────────────────

def build_admin_reply(branding: dict, customer_name: str, subject: str, reply_message: str, reference_id: str) -> Tuple[str, str]:
    """
    Renders (HTML, Plain Text) for Support Team response.
    """
    html_content = f"""
    <h2 style="margin: 0 0 16px; color: #111827; font-size: 20px; font-weight: bold;">Hello {customer_name},</h2>
    <p style="margin: 0 0 24px;">Our support team has reviewed your message and provided the following response:</p>
    
    <div class="card-item" style="background-color: #F9FAFB; border-left: 4px solid #2563EB; padding: 20px; margin: 24px 0; border-radius: 4px; border: 1px solid #E5E7EB; border-left-color: #2563EB;">
      <p style="margin: 0 0 12px; font-size: 12px; color: #6B7280; font-weight: bold; text-transform: uppercase;" class="text-muted">Reference Subject</p>
      <p style="margin: 0 0 16px 0; font-size: 14px; font-weight: bold; color: #111827;">{subject}</p>
      
      <p style="margin: 0 0 8px; font-size: 12px; color: #6B7280; font-weight: bold; text-transform: uppercase;" class="text-muted">Response</p>
      <div style="font-size: 15px; color: #374151; white-space: pre-wrap; line-height: 1.6;">{reply_message}</div>
    </div>
    
    <p style="margin: 0 0 16px;">If you have any further questions, please feel free to reply to this email or contact support.</p>
    """
    
    html = wrap_in_design_system(
        branding=branding,
        content_html=html_content,
        title="Support Response",
        tagline="We have responded to your message",
        reference_id=reference_id
    )

    text = f"Hello {customer_name},\n\n" \
           f"Our support team has responded to your inquiry.\n\n" \
           f"SUBJECT: {subject}\n\n" \
           f"RESPONSE:\n{reply_message}\n\n" \
           f"If you have further questions, feel free to reply to this email." \
           + build_shared_footer_text(branding, reference_id)

    return html, text


# ── Template 4: Order Confirmation ──────────────────────────────────────────

def build_order_confirmation(branding: dict, order_data: dict, reference_id: str) -> Tuple[str, str]:
    """
    Renders (HTML, Plain Text) for Order Confirmation customer receipt.
    order_data should contain formatted values compiled in the service layer.
    """
    order_number = order_data.get("order_number", "N/A")
    customer_name = order_data.get("customer_name", "Customer").split()[0]
    payment_method = order_data.get("payment_method", "COD")
    payment_status = order_data.get("payment_status", "PENDING")
    expected_delivery = order_data.get("expected_delivery", "—")
    view_order_url = order_data.get("view_order_url", "")
    
    # Financial details
    price = order_data.get("price", 0)
    qty = order_data.get("quantity", 1)
    subtotal = order_data.get("subtotal", price * qty)
    shipping_fee = order_data.get("shipping_fee", 0)
    total_amount = order_data.get("total_amount", 0)
    
    product_name = order_data.get("product_name", "N/A")
    variant_str = order_data.get("variant_str", "")
    shipping_addr_html = order_data.get("shipping_addr_html", "")
    shipping_addr_text = order_data.get("shipping_addr_text", "")

    html_content = f"""
    <h2 style="margin: 0 0 16px; color: #111827; font-size: 20px; font-weight: bold;">Hi {customer_name},</h2>
    <p style="margin: 0 0 24px;">Your order has been confirmed successfully! Thank you for shopping with us.</p>
    
    <!-- Order Header Info -->
    <div class="card-item" style="background-color: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size: 14px; color: #374151;">
        <tr>
          <td style="padding-bottom: 8px; width: 50%;"><strong>Order ID:</strong> #{order_number}</td>
          <td style="padding-bottom: 8px; text-align: right;"><strong>Payment Method:</strong> {payment_method}</td>
        </tr>
        <tr>
          <td><strong>Status:</strong> <span style="color: #16A34A; font-weight: bold;">{payment_status}</span></td>
          <td style="text-align: right;"><strong>Estimated Delivery:</strong> {expected_delivery}</td>
        </tr>
      </table>
    </div>
    
    <!-- Product Detail / Order Summary Card -->
    <div class="card-item" style="border: 1px solid #E5E7EB; border-radius: 8px; padding: 20px; margin-bottom: 24px; background-color: #FFFFFF;">
      <h3 style="margin: 0 0 16px; color: #111827; font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">Order Summary</h3>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size: 14px; line-height: 1.5; color: #374151;">
        <tr>
          <td style="padding-bottom: 12px; border-bottom: 1px solid #E5E7EB; vertical-align: top;">
            <div style="font-weight: bold; color: #111827;">{product_name}</div>
            <div class="text-muted" style="color: #6B7280; font-size: 12px; margin-top: 4px;">{variant_str}</div>
          </td>
          <td style="padding-bottom: 12px; text-align: right; font-weight: bold; color: #111827; border-bottom: 1px solid #E5E7EB; vertical-align: top;">
            Qty {qty} × ₹{price:,.2f}
          </td>
        </tr>
        
        <!-- Totals -->
        <tr>
          <td style="padding: 12px 0 6px 0; color: #6B7280;" class="text-muted">Subtotal</td>
          <td style="padding: 12px 0 6px 0; text-align: right; color: #111827;">₹{subtotal:,.2f}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #6B7280;" class="text-muted">Shipping</td>
          <td style="padding: 6px 0; text-align: right; color: #16A34A; font-weight: bold;">
            {"FREE" if shipping_fee == 0 else f"₹{shipping_fee:,.2f}"}
          </td>
        </tr>
        <tr>
          <td class="divider" style="padding: 12px 0 0 0; border-top: 1px solid #E5E7EB; color: #111827; font-weight: bold; font-size: 16px;">Grand Total</td>
          <td class="divider" style="padding: 12px 0 0 0; border-top: 1px solid #E5E7EB; text-align: right; color: #2563EB; font-weight: bold; font-size: 18px;">
            ₹{total_amount:,.2f}
          </td>
        </tr>
      </table>
    </div>
    
    <!-- Shipping Address Card -->
    <div class="card-item" style="border: 1px solid #E5E7EB; border-radius: 8px; padding: 20px; margin-bottom: 24px; background-color: #FFFFFF;">
      <h3 style="margin: 0 0 12px; color: #111827; font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">Shipping Address</h3>
      <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #374151;">{shipping_addr_html}</p>
    </div>
    
    <p style="margin: 0 0 16px; font-size: 14px; color: #6B7280;" class="text-muted"><strong>Note:</strong> A copy of your tax invoice is attached as a PDF document for your records.</p>
    """
    
    html = wrap_in_design_system(
        branding=branding,
        content_html=html_content,
        title=f"Order Confirmed #{order_number}",
        tagline="Thank you for your purchase",
        action_button={"text": "View Order Details", "url": view_order_url},
        reference_id=reference_id
    )

    text = f"Hi {customer_name},\n\n" \
           f"Your order #{order_number} has been confirmed successfully!\n\n" \
           f"ORDER DETAILS:\n" \
           f"- Item: {product_name} ({variant_str})\n" \
           f"- Quantity: {qty}\n" \
           f"- Price: ₹{price:,.2f}\n" \
           f"- Shipping Fee: ₹{shipping_fee:,.2f}\n" \
           f"- Total Amount: ₹{total_amount:,.2f}\n\n" \
           f"SHIPPING ADDRESS:\n{shipping_addr_text}\n\n" \
           f"Estimated Delivery: {expected_delivery}\n" \
           f"Payment Method: {payment_method} ({payment_status})\n\n" \
           f"View details: {view_order_url}" \
           + build_shared_footer_text(branding, reference_id)

    return html, text


# ── Template 5: Payment Successful ──────────────────────────────────────────

def build_payment_successful(branding: dict, order_data: dict, reference_id: str) -> Tuple[str, str]:
    """
    Renders (HTML, Plain Text) for Payment Confirmed details.
    """
    order_number = order_data.get("order_number", "N/A")
    total_amount = order_data.get("total_amount", 0)
    payment_id = order_data.get("payment_id", "—")
    payment_method = order_data.get("payment_method", "Online Payment")
    payment_status = order_data.get("payment_status", "PAID")
    customer_name = order_data.get("customer_name", "Customer").split()[0]
    view_order_url = order_data.get("view_order_url", "")
    
    html_content = f"""
    <h2 style="margin: 0 0 16px; color: #111827; font-size: 20px; font-weight: bold;">Hello {customer_name},</h2>
    <p style="margin: 0 0 24px;">We've received your payment! Thank you. Your transaction was successful.</p>
    
    <div class="card-item" style="border: 1px solid #E5E7EB; border-radius: 8px; padding: 20px; margin-bottom: 24px; background-color: #FFFFFF;">
      <h3 style="margin: 0 0 16px; color: #111827; font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">Payment Details</h3>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size: 14px; line-height: 2.0; color: #374151;">
        <tr>
          <td style="color: #6B7280;" class="text-muted">Payment ID</td>
          <td style="text-align: right; font-weight: bold; color: #111827;">{payment_id}</td>
        </tr>
        <tr>
          <td style="color: #6B7280;" class="text-muted">Order Number</td>
          <td style="text-align: right; font-weight: bold; color: #111827;">#{order_number}</td>
        </tr>
        <tr>
          <td style="color: #6B7280;" class="text-muted">Amount Paid</td>
          <td style="text-align: right; font-weight: bold; color: #2563EB; font-size: 16px;">₹{total_amount:,.2f}</td>
        </tr>
        <tr>
          <td style="color: #6B7280;" class="text-muted">Payment Method</td>
          <td style="text-align: right; color: #111827;">{payment_method}</td>
        </tr>
        <tr>
          <td style="color: #6B7280;" class="text-muted">Status</td>
          <td style="text-align: right; font-weight: bold; color: #16A34A;">{payment_status}</td>
        </tr>
      </table>
    </div>
    
    <p style="margin: 0 0 16px;">We are currently preparing your items for shipment. You will receive another notification once your package leaves our facility.</p>
    """
    
    html = wrap_in_design_system(
        branding=branding,
        content_html=html_content,
        title="Payment Confirmed",
        tagline="Transaction Receipt",
        action_button={"text": "View Order", "url": view_order_url},
        reference_id=reference_id
    )

    text = f"Hello {customer_name},\n\n" \
           f"We have received your payment for order #{order_number}.\n\n" \
           f"PAYMENT DETAILS:\n" \
           f"- Payment ID: {payment_id}\n" \
           f"- Amount Paid: ₹{total_amount:,.2f}\n" \
           f"- Method: {payment_method}\n" \
           f"- Status: {payment_status}\n\n" \
           f"We are preparing your items. Track here: {view_order_url}" \
           + build_shared_footer_text(branding, reference_id)

    return html, text


# ── Template 6: Order Shipped ────────────────────────────────────────────────

def build_order_shipped(branding: dict, order_data: dict, reference_id: str) -> Tuple[str, str]:
    """
    Renders (HTML, Plain Text) for Shipment information.
    """
    order_number = order_data.get("order_number", "N/A")
    courier = order_data.get("logistics", "Standard Delivery")
    tracking_id = order_data.get("tracking_id", "—")
    customer_name = order_data.get("customer_name", "Customer").split()[0]
    expected_delivery = order_data.get("expected_delivery", "—")
    track_url = order_data.get("view_order_url", "")
    
    html_content = f"""
    <h2 style="margin: 0 0 16px; color: #111827; font-size: 20px; font-weight: bold;">Great news {customer_name}!</h2>
    <p style="margin: 0 0 24px;">Your order <strong>#{order_number}</strong> is on its way. It will arrive at your shipping address soon.</p>
    
    <div class="card-item" style="border: 1px solid #E5E7EB; border-radius: 8px; padding: 20px; margin-bottom: 24px; background-color: #FFFFFF;">
      <h3 style="margin: 0 0 16px; color: #111827; font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">Tracking Information</h3>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size: 14px; line-height: 2.0; color: #374151;">
        <tr>
          <td style="color: #6B7280;" class="text-muted">Courier Partner</td>
          <td style="text-align: right; font-weight: bold; color: #111827;">{courier}</td>
        </tr>
        <tr>
          <td style="color: #6B7280;" class="text-muted">Tracking Number</td>
          <td style="text-align: right; font-weight: bold; color: #2563EB;">{tracking_id}</td>
        </tr>
        <tr>
          <td style="color: #6B7280;" class="text-muted">Estimated Delivery</td>
          <td style="text-align: right; font-weight: bold; color: #111827;">{expected_delivery}</td>
        </tr>
      </table>
    </div>
    
    <p style="margin: 0 0 16px;">Please note it can take up to 24 hours for tracking updates to appear on the courier's website.</p>
    """
    
    html = wrap_in_design_system(
        branding=branding,
        content_html=html_content,
        title="Order Shipped",
        tagline="Your package is on its way",
        action_button={"text": "Track Order Now", "url": track_url},
        reference_id=reference_id
    )

    text = f"Great news {customer_name}!\n\n" \
           f"Your order #{order_number} is on its way.\n\n" \
           f"TRACKING DETAILS:\n" \
           f"- Courier Partner: {courier}\n" \
           f"- Tracking Number: {tracking_id}\n" \
           f"- Estimated Delivery: {expected_delivery}\n\n" \
           f"Track delivery: {track_url}" \
           + build_shared_footer_text(branding, reference_id)

    return html, text


# ── Template 7: Order Cancelled ──────────────────────────────────────────────

def build_order_cancelled(branding: dict, order_data: dict, reference_id: str) -> Tuple[str, str]:
    """
    Renders (HTML, Plain Text) for cancellation notification.
    """
    order_number = order_data.get("order_number", "N/A")
    reason = order_data.get("reason", "Cancelled upon request.")
    refund_status_text = order_data.get("refund_status_text", "No charges were processed.")
    customer_name = order_data.get("customer_name", "Customer").split()[0]
    
    html_content = f"""
    <h2 style="margin: 0 0 16px; color: #111827; font-size: 20px; font-weight: bold;">Hello {customer_name},</h2>
    <p style="margin: 0 0 24px;">Your order <strong>#{order_number}</strong> has been cancelled.</p>
    
    <div class="card-item" style="border: 1px solid #E5E7EB; border-radius: 8px; padding: 20px; margin-bottom: 24px; background-color: #FFFFFF;">
      <h3 style="margin: 0 0 16px; color: #111827; font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">Cancellation Info</h3>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size: 14px; line-height: 2.0; color: #374151;">
        <tr>
          <td style="color: #6B7280; vertical-align: top; width: 35%;" class="text-muted">Reason</td>
          <td style="text-align: right; color: #111827;">{reason}</td>
        </tr>
        <tr>
          <td style="color: #6B7280; vertical-align: top;" class="text-muted">Refund Status</td>
          <td style="text-align: right; font-weight: bold; color: #EA580C;">{refund_status_text}</td>
        </tr>
      </table>
    </div>
    
    <p style="margin: 0 0 16px;">We apologize for any inconvenience caused. If you did not request this cancellation, please contact our support team immediately.</p>
    """
    
    html = wrap_in_design_system(
        branding=branding,
        content_html=html_content,
        title="Order Cancelled",
        tagline="Information about your cancelled order",
        reference_id=reference_id
    )

    text = f"Hello {customer_name},\n\n" \
           f"Your order #{order_number} has been cancelled.\n\n" \
           f"CANCELLATION DETAILS:\n" \
           f"- Reason: {reason}\n" \
           f"- Refund Status: {refund_status_text}\n\n" \
           f"If you did not request this, please contact support immediately." \
           + build_shared_footer_text(branding, reference_id)

    return html, text


# ── Template 8: Low Stock Alert ──────────────────────────────────────────────

def build_low_stock_alert(branding: dict, product_name: str, stock: int, sku: str, threshold: int, manage_url: str, reference_id: str) -> Tuple[str, str]:
    """
    Renders (HTML, Plain Text) for low stock warnings.
    """
    sku_str = sku or "N/A"
    html_content = f"""
    <h2 style="margin: 0 0 16px; color: #111827; font-size: 20px; font-weight: bold;">⚠️ Low Stock Alert</h2>
    <p style="margin: 0 0 24px;">This is an administrative alert to notify you that stock for a product variant has dropped below the threshold.</p>
    
    <div class="card-item" style="border: 1px solid #E5E7EB; border-radius: 8px; padding: 20px; margin-bottom: 24px; background-color: #FFFFFF;">
      <h3 style="margin: 0 0 16px; color: #111827; font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">Variant Inventory details</h3>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size: 14px; line-height: 2.0; color: #374151;">
        <tr>
          <td style="color: #6B7280;" class="text-muted">Product</td>
          <td style="text-align: right; font-weight: bold; color: #111827;">{product_name}</td>
        </tr>
        <tr>
          <td style="color: #6B7280;" class="text-muted">SKU</td>
          <td style="text-align: right; font-family: monospace; color: #111827;">{sku_str}</td>
        </tr>
        <tr>
          <td style="color: #6B7280;" class="text-muted">Current Stock</td>
          <td style="text-align: right; font-weight: bold; color: #EA580C; font-size: 16px;">{stock} units</td>
        </tr>
        <tr>
          <td style="color: #6B7280;" class="text-muted">Threshold</td>
          <td style="text-align: right; color: #6B7280;">{threshold} units</td>
        </tr>
      </table>
    </div>
    
    <p style="margin: 0 0 16px;">Please restock this item in the Admin Dashboard to avoid running out of stock.</p>
    """
    
    html = wrap_in_design_system(
        branding=branding,
        content_html=html_content,
        title="Low Stock Alert",
        tagline="Inventory Warning System",
        action_button={"text": "Manage Inventory", "url": manage_url},
        reference_id=reference_id
    )

    text = f"Low Stock Alert Warning\n\n" \
           f"The stock level for the following variant has dropped below the threshold:\n" \
           f"- Product: {product_name}\n" \
           f"- SKU: {sku_str}\n" \
           f"- Current Stock: {stock} units\n" \
           f"- Alert Threshold: {threshold} units\n\n" \
           f"Manage stock in Admin: {manage_url}" \
           + build_shared_footer_text(branding, reference_id)

    return html, text
