from decimal import Decimal
from typing import Optional

from sqlalchemy.orm import Session

from app.modules.settings.models import PaymentMethod


def _decimal(value) -> Decimal:
    if value is None:
        return Decimal("0.00")
    return Decimal(str(value)).quantize(Decimal("0.01"))


def resolve_shipping_fee(db: Session, payment_method: Optional[str] = None) -> Decimal:
    methods = (
        db.query(PaymentMethod)
        .filter(PaymentMethod.is_active.is_(True))
        .order_by(PaymentMethod.id.asc())
        .all()
    )
    if not methods:
        return Decimal("0.00")

    method_name = (payment_method or "ONLINE").upper()
    preferred_name = "Cash On Delivery" if method_name == "COD" else "Online Payment"

    preferred = next(
        (
            method
            for method in methods
            if (method.name or "").strip().lower() == preferred_name.lower()
        ),
        None,
    )

    selected = preferred or next(
        (
            method
            for method in methods
            if (method.name or "").strip().lower() == "online payment"
        ),
        methods[0],
    )

    return _decimal(selected.fee)


def calculate_amount_paise(subtotal: Decimal, shipping_fee: Decimal, discount_amount: Decimal) -> tuple[Decimal, int]:
    final_total = _decimal(subtotal) + _decimal(shipping_fee) - _decimal(discount_amount)
    amount_paise = int(round(final_total * 100))
    return final_total, amount_paise
