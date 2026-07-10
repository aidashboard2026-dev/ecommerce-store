"""
app/modules/payments/service.py

Business logic for Razorpay integration.

Responsibilities
----------------
- Initialize Razorpay client
- Create Razorpay Order
- Verify Razorpay Signature

No SQLAlchemy.
No Order creation.
No Inventory logic.
"""

import razorpay

from fastapi import HTTPException

from app.core.config import settings


class RazorpayService:

    def __init__(self):
        self.client = razorpay.Client(
            auth=(
                settings.RAZORPAY_KEY_ID,
                settings.RAZORPAY_KEY_SECRET,
            )
        )

    # ------------------------------------------------------
    # Create Razorpay Order
    # ------------------------------------------------------

    def create_order(
        self,
        *,
        amount: int,
        currency: str = "INR",
        receipt: str | None = None,
    ):
        """
        Creates Razorpay Order.

        Amount must be in paise.
        """

        try:

            data = {
                "amount": amount,
                "currency": currency,
                "receipt": receipt,
                "payment_capture": 1,
            }

            return self.client.order.create(data)

        except Exception as e:

            raise HTTPException(
                status_code=500,
                detail=f"Failed to create Razorpay order: {str(e)}",
            )

    # ------------------------------------------------------
    # Verify Signature
    # ------------------------------------------------------

    def verify_signature(
        self,
        *,
        razorpay_order_id: str,
        razorpay_payment_id: str,
        razorpay_signature: str,
    ):

        try:

            self.client.utility.verify_payment_signature(
                {
                    "razorpay_order_id": razorpay_order_id,
                    "razorpay_payment_id": razorpay_payment_id,
                    "razorpay_signature": razorpay_signature,
                }
            )

            return True

        except Exception:

            return False


payment_service = RazorpayService()