"""
app/modules/payments/router.py

Payment Router

Responsibilities
----------------
- Receive HTTP requests
- Validate request using Pydantic schemas
- Call payment service
- Return API response

No Razorpay logic.
No SQLAlchemy.
No Order creation.
"""

from fastapi import APIRouter

from app.modules.payments.schemas import (
    CreatePaymentRequest,
    CreatePaymentResponse,
    VerifyPaymentRequest,
    VerifyPaymentResponse,
)

from app.modules.payments.service import payment_service

router = APIRouter()


# ----------------------------------------------------------
# Create Razorpay Order
# ----------------------------------------------------------

@router.post(
    "/create-order",
    response_model=CreatePaymentResponse,
)
def create_payment_order(payload: CreatePaymentRequest):

    order = payment_service.create_order(
        amount=payload.amount,
        currency=payload.currency,
        receipt=payload.receipt,
    )

    return CreatePaymentResponse(
        order_id=order["id"],
        amount=order["amount"],
        currency=order["currency"],
        key_id=payment_service.client.auth[0],
    )


# ----------------------------------------------------------
# Verify Payment Signature
# ----------------------------------------------------------

@router.post(
    "/verify",
    response_model=VerifyPaymentResponse,
)
def verify_payment(payload: VerifyPaymentRequest):

    verified = payment_service.verify_signature(
        razorpay_order_id=payload.razorpay_order_id,
        razorpay_payment_id=payload.razorpay_payment_id,
        razorpay_signature=payload.razorpay_signature,
    )

    if verified:

        return VerifyPaymentResponse(
            success=True,
            message="Payment verified successfully",
        )

    return VerifyPaymentResponse(
        success=False,
        message="Payment verification failed",
    )