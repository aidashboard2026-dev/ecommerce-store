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

from app.core.config import settings
from app.shared.exceptions import BusinessRuleError, ExternalServiceError


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
        if amount < 100:
            raise BusinessRuleError(
                "Amount must be at least 100 paise (1.00 INR).",
                code="INVALID_AMOUNT",
            )

        try:

            data = {
                "amount": amount,
                "currency": currency,
                "receipt": receipt,
                "payment_capture": 1,
            }

            return self.client.order.create(data)

        except Exception as e:

            raise ExternalServiceError(
                f"Failed to create Razorpay order: {str(e)}",
                code="RAZORPAY_API_FAILURE",
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