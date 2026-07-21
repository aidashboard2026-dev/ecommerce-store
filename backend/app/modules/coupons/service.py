import logging
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.modules.coupons.models import Coupon, CouponUsage

logger = logging.getLogger(__name__)


def create_coupon(db: Session, data: dict) -> Coupon:
    existing = db.query(Coupon).filter(Coupon.code == data["code"]).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Coupon code '{data['code']}' already exists.",
        )
    coupon = Coupon(**data)
    db.add(coupon)
    try:
        db.commit()
        db.refresh(coupon)
    except Exception as e:
        db.rollback()
        logger.error("Failed to create coupon: %s", e)
        raise HTTPException(status_code=500, detail="Failed to create coupon.")
    return coupon


def update_coupon(db: Session, coupon_id: int, data: dict) -> Optional[Coupon]:
    coupon = db.query(Coupon).filter(Coupon.id == coupon_id).first()
    if not coupon:
        return None
    for field, value in data.items():
        setattr(coupon, field, value)
    try:
        db.commit()
        db.refresh(coupon)
    except Exception as e:
        db.rollback()
        logger.error("Failed to update coupon: %s", e)
        raise HTTPException(status_code=500, detail="Failed to update coupon.")
    return coupon


def get_coupons(db: Session):
    return db.query(Coupon).order_by(Coupon.created_at.desc()).all()


def get_coupon(db: Session, coupon_id: int) -> Optional[Coupon]:
    return db.query(Coupon).filter(Coupon.id == coupon_id).first()


def delete_coupon(db: Session, coupon_id: int) -> Optional[Coupon]:
    coupon = db.query(Coupon).filter(Coupon.id == coupon_id).first()
    if coupon:
        db.delete(coupon)
        try:
            db.commit()
        except Exception as e:
            db.rollback()
            raise e
    return coupon


def validate_coupon(
    db: Session,
    code: str,
    subtotal: Decimal,
    customer_email: Optional[str] = None,
) -> dict:
    now = datetime.now(timezone.utc)
    code = code.strip().upper()

    coupon = db.query(Coupon).filter(Coupon.code == code).first()
    if not coupon:
        return {"valid": False, "discount_percent": None, "discount_amount": None, "message": "Invalid coupon code."}

    if not coupon.is_active:
        return {"valid": False, "discount_percent": None, "discount_amount": None, "message": "This coupon is no longer active."}

    if coupon.valid_from and coupon.valid_from > now:
        return {"valid": False, "discount_percent": None, "discount_amount": None, "message": "This coupon is not yet valid."}

    if coupon.valid_until and coupon.valid_until < now:
        return {"valid": False, "discount_percent": None, "discount_amount": None, "message": "This coupon has expired."}

    if subtotal < coupon.min_order:
        min_order_float = float(coupon.min_order)
        return {"valid": False, "discount_percent": None, "discount_amount": None, "message": f"Minimum order amount is ₹{min_order_float:,.2f} to use this coupon."}

    if coupon.max_uses > 0:
        total_uses = db.query(func.count(CouponUsage.id)).filter(CouponUsage.coupon_id == coupon.id).scalar() or 0
        if total_uses >= coupon.max_uses:
            return {"valid": False, "discount_percent": None, "discount_amount": None, "message": "This coupon has reached its maximum usage limit."}

    if customer_email and coupon.max_uses_per_user > 0:
        user_uses = (
            db.query(func.count(CouponUsage.id))
            .filter(CouponUsage.coupon_id == coupon.id, CouponUsage.customer_email == customer_email)
            .scalar() or 0
        )
        if user_uses >= coupon.max_uses_per_user:
            return {"valid": False, "discount_percent": None, "discount_amount": None, "message": "You have already used this coupon the maximum number of times."}

    pct = coupon.discount_percent
    raw_discount = subtotal * pct / Decimal("100")
    max_disc = coupon.max_discount
    discount_amount = min(raw_discount, max_disc) if max_disc is not None else raw_discount

    return {
        "valid": True,
        "discount_percent": pct,
        "discount_amount": discount_amount,
        "message": "Coupon applied successfully.",
    }


def record_usage(db: Session, coupon_id: int, order_id: int, customer_email: str) -> None:
    usage = CouponUsage(coupon_id=coupon_id, order_id=order_id, customer_email=customer_email)
    db.add(usage)


def lookup_coupon(db: Session, code: str) -> Optional[Coupon]:
    return db.query(Coupon).filter(Coupon.code == code.strip().upper()).first()
