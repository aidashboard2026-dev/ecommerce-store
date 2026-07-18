import logging
from decimal import Decimal
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.modules.admins.models import Admin
from app.modules.auth.dependencies import get_current_admin
from app.modules.audit.service import audit
from app.modules.coupons.schemas import (
    CouponCreate,
    CouponResponse,
    CouponUpdate,
    CouponValidateRequest,
    CouponValidateResponse,
)
from app.modules.coupons.service import (
    create_coupon,
    delete_coupon,
    get_coupon,
    get_coupons,
    update_coupon,
    validate_coupon as svc_validate_coupon,
)

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/validate", response_model=CouponValidateResponse)
def validate_coupon_endpoint(
    payload: CouponValidateRequest,
    db: Session = Depends(get_db),
):
    result = svc_validate_coupon(
        db,
        code=payload.code,
        subtotal=payload.subtotal,
        customer_email=payload.customer_email,
    )
    return CouponValidateResponse(
        valid=result["valid"],
        code=payload.code,
        discount_percent=result.get("discount_percent"),
        discount_amount=result.get("discount_amount"),
        message=result["message"],
    )


@router.post("/admin", response_model=CouponResponse)
def create_coupon_endpoint(
    payload: CouponCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    result = create_coupon(db, payload.model_dump())
    audit(db, action="create", resource_type="coupon", resource_label=result.code, admin_id=current_admin.id, ip_address=request.client.host if request.client else None)
    return result


@router.get("/admin", response_model=List[CouponResponse])
def list_coupons_endpoint(
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    return get_coupons(db)


@router.get("/admin/{coupon_id}", response_model=CouponResponse)
def get_coupon_endpoint(
    coupon_id: int,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    coupon = get_coupon(db, coupon_id)
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon not found.")
    return coupon


@router.put("/admin/{coupon_id}", response_model=CouponResponse)
def update_coupon_endpoint(
    coupon_id: int,
    payload: CouponUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    update_data = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update.")
    result = update_coupon(db, coupon_id, update_data)
    if not result:
        raise HTTPException(status_code=404, detail="Coupon not found.")
    audit(db, action="update", resource_type="coupon", resource_label=result.code, admin_id=current_admin.id, ip_address=request.client.host if request.client else None)
    return result


@router.delete("/admin/{coupon_id}")
def delete_coupon_endpoint(
    coupon_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    coupon = get_coupon(db, coupon_id)
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon not found.")
    label = coupon.code
    delete_coupon(db, coupon_id)
    audit(db, action="delete", resource_type="coupon", resource_label=label, admin_id=current_admin.id, ip_address=request.client.host if request.client else None)
    return {"message": "Coupon deleted successfully."}
