from datetime import datetime, timezone, timedelta
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_admin
from app.database.session import get_db
from app.models.admin import Admin
from app.models.order import Order
from app.models.product import Product, ProductVariant
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
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Order number already exists",
        )

    delivery_days_map = {
        "Chennai": 3, "Coimbatore": 4, "Salem": 5, "Madurai": 6,
        "Trichy": 4, "Erode": 4, "Tiruppur": 4, "Vellore": 5,
        "Thanjavur": 5, "Tirunelveli": 7, "Thoothukudi": 7, "Dindigul": 5,
        "Namakkal": 4, "Karur": 4, "Kanchipuram": 3, "Cuddalore": 5,
        "Nagapattinam": 6, "Ramanathapuram": 7, "Sivagangai": 6,
        "Virudhunagar": 6, "Kanyakumari": 7, "Dharmapuri": 5,
        "Krishnagiri": 5, "Ariyalur": 5, "Perambalur": 5, "Pudukkottai": 6,
        "Nilgiris": 6, "Tenkasi": 7, "Ranipet": 4, "Tirupathur": 5,
        "Mayiladuthurai": 6,
    }

    delivery_days = delivery_days_map.get(order_in.city, 5)
    now_utc = datetime.now(timezone.utc)
    expected_delivery_date = now_utc + timedelta(days=delivery_days)

    data = order_in.model_dump()
    data.pop("order_number", None)
    data["delivery_days"] = delivery_days
    data["expected_delivery_date"] = expected_delivery_date

    # ── Inventory check and decrement ─────────────────────────────────────────
    # Find the matching variant by product title + size + optional color.
    # This uses the existing schema (no new columns required).
    variant_to_decrement = None
    if order_in.product_name and order_in.size:
        variant_q = (
            db.query(ProductVariant)
            .join(Product, Product.id == ProductVariant.product_id)
            .filter(
                Product.title == order_in.product_name,
                ProductVariant.size == order_in.size,
                Product.deleted_at.is_(None),
            )
        )
        if order_in.color:
            variant_q = variant_q.filter(ProductVariant.color == order_in.color)

        variant_to_decrement = variant_q.first()

        if variant_to_decrement is not None:
            qty = order_in.quantity or 1
            if variant_to_decrement.stock_quantity < qty:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        f"Insufficient stock for '{order_in.product_name}' "
                        f"(size: {order_in.size}). "
                        f"Available: {variant_to_decrement.stock_quantity}, "
                        f"requested: {qty}."
                    ),
                )

    order = Order(order_number=order_number, **data)

    if not order.ordered_at:
        order.ordered_at = now_utc

    order.expected_delivery_date = order.ordered_at + timedelta(days=order.delivery_days)

    db.add(order)

    # Decrement stock in the same transaction as order creation
    if variant_to_decrement is not None:
        variant_to_decrement.stock_quantity -= (order_in.quantity or 1)

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
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    return order


@router.put("/{order_id}", response_model=OrderResponse)
def update_order(
    order_id: int,
    payload: OrderUpdate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    update_data = payload.model_dump(exclude_unset=True)
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
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    order.tracking_status = tracking_status
    db.commit()
    db.refresh(order)
    return order
