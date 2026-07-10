"""
app/modules/payments/schemas.py

Pydantic schemas for Razorpay payment flow.

Responsibilities:
- Validate payment request payloads.
- Define API request/response contracts.
- No business logic.
"""

from pydantic import BaseModel, Field
from typing import Optional
from app.modules.orders.schemas import OrderCreate


# ----------------------------------------------------------------------
# Create Razorpay Order
# ----------------------------------------------------------------------

class CreatePaymentRequest(BaseModel):
    """
    Request received from the frontend before opening Razorpay.
    """

    amount: int = Field(..., gt=0, description="Amount in paise")
    currency: str = Field(default="INR")
    receipt: Optional[str] = None


class CreatePaymentResponse(BaseModel):
    """
    Response returned after creating a Razorpay Order.
    """

    order_id: str
    amount: int
    currency: str
    key_id: str


# ----------------------------------------------------------------------
# Verify Razorpay Payment
# ----------------------------------------------------------------------

class VerifyPaymentRequest(BaseModel):
    """
    Payload received after successful Razorpay payment.
    """

    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


class VerifyPaymentResponse(BaseModel):
    """
    Response after signature verification.
    """

    success: bool
    message: str

class VerifyPaymentRequest(BaseModel):

    razorpay_order_id: str

    razorpay_payment_id: str

    razorpay_signature: str

    order: OrderCreate