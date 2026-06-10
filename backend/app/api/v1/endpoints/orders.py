from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_admin
from app.database.session import get_db
from app.models.admin import Admin
from app.models.order import Order
from app.schemas.order import OrderCreate, OrderResponse, OrderUpdate

router = APIRouter()


def _generate_order_number(db: Session) -> str:
    prefix = datetime.now(timezone.utc).strftime("ORD-%Y%m%d%H%M%S")
    candidate = prefix
    suffix = 1

    while db.query(Order).filter(Order.order_number == candidate).first():
        suffix += 1
        candidate = f"{prefix}-{suffix}"

    return candidate


@router.get("/", response_model=List[OrderResponse])
def list_orders(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    return (
        db.query(Order)
        .order_by(Order.ordered_at.desc(), Order.id.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

@router.post("/", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
def create_order(
    order_in: OrderCreate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    order_number = order_in.order_number or _generate_order_number(db)

    existing = (
        db.query(Order)
        .filter(Order.order_number == order_number)
        .first()
    )
    data = order_in.model_dump()

    data.pop("order_number", None)

    order = Order(
        order_number=order_number,
        **data
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Order number already exists",
        )

    # data = order_in.model_dump()

    # # duplicate order_number avoid panna
    # data.pop("order_number", None)

    # order = Order(
    #     order_number=order_number,
    #     **data
    # )

    if not order.ordered_at:
        order.ordered_at = datetime.utcnow()

    db.add(order)
    db.commit()
    db.refresh(order)

    return order

@router.get("/{order_id}", response_model=OrderResponse)
def get_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    order = db.query(Order).filter(Order.id == order_id).first()

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )

    return order

@router.put("/{order_id}", response_model=OrderResponse)
def update_order(
    order_id: int,
    order_in: OrderUpdate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    order = db.query(Order).filter(Order.id == order_id).first()

    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    update_data = order_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(order, field, value)

    db.commit()
    db.refresh(order)
    return order


@router.post("/{order_id}/cancel", response_model=OrderResponse)
def cancel_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    order = db.query(Order).filter(Order.id == order_id).first()

    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    order.tracking_status = "CANCELLED"
    db.commit()
    db.refresh(order)
    return order

@router.put("/{order_id}/tracking", response_model=OrderResponse)
def update_tracking(
    order_id: int,
    tracking_status: str,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    order = db.query(Order).filter(Order.id == order_id).first()

    if not order:
        raise HTTPException(
            status_code=404,
            detail="Order not found"
        )

    order.tracking_status = tracking_status

    db.commit()
    db.refresh(order)

    return order