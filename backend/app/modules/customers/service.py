from __future__ import annotations

import math
from typing import Any, Dict, List, Optional

from fastapi import HTTPException, status
from sqlalchemy import Integer, cast, func, or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.modules.customers.models import Customer
from app.modules.orders.models import Order
from app.modules.customers.schemas import (
    CustomerCreate,
    CustomerListResponse,
    CustomerOrderSummary,
    CustomerProfileResponse,
    CustomerResponse,
    CustomerSpendingOverview,
    CustomerUpdate,
)

MAX_PER_PAGE = 100


# ─────────────────────────────────────────────────────────────────────────────
# Internal helpers
# ─────────────────────────────────────────────────────────────────────────────

def _tags_to_str(tags: Optional[List[str]]) -> Optional[str]:
    if not tags:
        return None
    return ",".join(sorted({t.strip().lower() for t in tags if t.strip()}))


def _build_order_stats_subquery(db: Session):
    """
    Single subquery that computes per-email order stats.
    Avoids N+1 — called once and joined to customer query.
    Returns a subquery with columns: customer_email, total_orders,
    total_spent, average_order_value, last_order_date, last_order_id.
    """
    sq = (
        db.query(
            Order.customer_email.label("customer_email"),
            func.count(Order.id).label("total_orders"),
            func.coalesce(func.sum(Order.total_amount), 0).label("total_spent"),
            func.coalesce(func.avg(Order.total_amount), 0).label("average_order_value"),
            func.max(Order.ordered_at).label("last_order_date"),
            func.max(Order.id).label("last_order_id"),
        )
        .filter(Order.customer_email.isnot(None))
        .group_by(Order.customer_email)
        .subquery("order_stats")
    )
    return sq


# ─────────────────────────────────────────────────────────────────────────────
# CRUD
# ─────────────────────────────────────────────────────────────────────────────

def create_customer(db: Session, data: CustomerCreate) -> Customer:
    existing = db.query(Customer).filter(Customer.email == data.email.lower()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Customer with email '{data.email}' already exists.",
        )

    customer = Customer(
        first_name=data.first_name.strip(),
        last_name=data.last_name.strip(),
        email=data.email.lower(),
        phone=data.phone,
        dob=data.dob,
        city=data.city,
        state=data.state,
        country=data.country,
        tags=_tags_to_str(data.tags),
        notes=data.notes,
        is_active=True,
        password_hash="",  # admin-created; no self-login
    )
    db.add(customer)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered.",
        )
    db.refresh(customer)
    return customer


def get_customer(db: Session, customer_id: int) -> Customer:
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Customer {customer_id} not found.",
        )
    return customer


def update_customer(db: Session, customer_id: int, data: CustomerUpdate) -> Customer:
    customer = get_customer(db, customer_id)
    update_data = data.model_dump(exclude_unset=True)

    if "tags" in update_data:
        update_data["tags"] = _tags_to_str(update_data["tags"])

    for field, value in update_data.items():
        setattr(customer, field, value)

    db.commit()
    db.refresh(customer)
    return customer


def toggle_customer_status(db: Session, customer_id: int, is_active: bool) -> Customer:
    customer = get_customer(db, customer_id)
    customer.is_active = is_active
    db.commit()
    db.refresh(customer)
    return customer


def update_customer_notes(db: Session, customer_id: int, notes: str) -> Customer:
    customer = get_customer(db, customer_id)
    customer.notes = notes
    db.commit()
    db.refresh(customer)
    return customer


def update_customer_tags(db: Session, customer_id: int, tags: List[str]) -> Customer:
    customer = get_customer(db, customer_id)
    customer.tags = _tags_to_str(tags)
    db.commit()
    db.refresh(customer)
    return customer


# ─────────────────────────────────────────────────────────────────────────────
# Paginated list with aggregated stats
# ─────────────────────────────────────────────────────────────────────────────

def get_customers_paginated(
    db: Session,
    page: int = 1,
    per_page: int = 20,
    search: Optional[str] = None,
    status_filter: Optional[str] = None,   # "active" | "inactive"
    tag_filter: Optional[str] = None,       # single tag string
    sort_by: str = "created_at",
    sort_dir: str = "desc",
) -> CustomerListResponse:
    per_page = min(per_page, MAX_PER_PAGE)
    page = max(page, 1)

    stats_sq = _build_order_stats_subquery(db)

    q = (
        db.query(
            Customer,
            func.coalesce(stats_sq.c.total_orders, 0).label("total_orders"),
            func.coalesce(stats_sq.c.total_spent, 0.0).label("total_spent"),
            func.coalesce(stats_sq.c.average_order_value, 0.0).label("average_order_value"),
            stats_sq.c.last_order_date.label("last_order_date"),
        )
        .outerjoin(stats_sq, Customer.email == stats_sq.c.customer_email)
    )

    # ── Search ────────────────────────────────────────────────────────────────
    if search:
        term = f"%{search.strip()}%"
        q = q.filter(
            or_(
                Customer.first_name.ilike(term),
                Customer.last_name.ilike(term),
                Customer.email.ilike(term),
                Customer.phone.ilike(term),
                (Customer.first_name + " " + Customer.last_name).ilike(term),
            )
        )

    # ── Status filter ─────────────────────────────────────────────────────────
    if status_filter == "active":
        q = q.filter(Customer.is_active.is_(True))
    elif status_filter == "inactive":
        q = q.filter(Customer.is_active.is_(False))

    # ── Tag filter ────────────────────────────────────────────────────────────
    if tag_filter:
        q = q.filter(Customer.tags.ilike(f"%{tag_filter.strip().lower()}%"))

    # ── Sorting ───────────────────────────────────────────────────────────────
    _SORT_COLS = {
        "created_at": Customer.created_at,
        "first_name": Customer.first_name,
        "last_name": Customer.last_name,
        "email": Customer.email,
        "total_orders": stats_sq.c.total_orders,
        "total_spent": stats_sq.c.total_spent,
        "last_order_date": stats_sq.c.last_order_date,
    }
    sort_col = _SORT_COLS.get(sort_by, Customer.created_at)
    if sort_dir == "asc":
        q = q.order_by(sort_col.asc().nulls_last())
    else:
        q = q.order_by(sort_col.desc().nulls_last())

    total = q.count()
    rows = q.offset((page - 1) * per_page).limit(per_page).all()

    items = []
    for customer, total_orders, total_spent, avg_val, last_order_date in rows:
        resp = CustomerResponse.model_validate(customer)
        resp.total_orders = int(total_orders or 0)
        resp.total_spent = float(total_spent or 0.0)
        resp.average_order_value = float(avg_val or 0.0)
        resp.last_order_date = last_order_date
        items.append(resp)

    return CustomerListResponse(
        items=items,
        total=total,
        page=page,
        per_page=per_page,
        pages=math.ceil(total / per_page) if total else 1,
    )


# ─────────────────────────────────────────────────────────────────────────────
# Customer profile (detail view)
# ─────────────────────────────────────────────────────────────────────────────

def get_customer_profile(db: Session, customer_id: int) -> CustomerProfileResponse:
    customer = get_customer(db, customer_id)

    # Aggregate order stats for this customer
    stats_row = (
        db.query(
            func.count(Order.id).label("total_orders"),
            func.coalesce(func.sum(Order.total_amount), 0).label("total_spent"),
            func.coalesce(func.avg(Order.total_amount), 0).label("average_order_value"),
            func.max(Order.ordered_at).label("last_order_date"),
            func.max(Order.id).label("last_order_id"),
        )
        .filter(Order.customer_email == customer.email)
        .one()
    )

    # Recent 10 orders — single query, no N+1
    recent_orders_db = (
        db.query(Order)
        .filter(Order.customer_email == customer.email)
        .order_by(Order.ordered_at.desc())
        .limit(10)
        .all()
    )
    recent_orders = [CustomerOrderSummary.model_validate(o) for o in recent_orders_db]

    spending = CustomerSpendingOverview(
        total_orders=int(stats_row.total_orders or 0),
        total_spent=float(stats_row.total_spent or 0),
        average_order_value=float(stats_row.average_order_value or 0),
        last_order_date=stats_row.last_order_date,
        last_order_id=stats_row.last_order_id,
    )

    profile = CustomerProfileResponse.model_validate(customer)
    profile.total_orders = spending.total_orders
    profile.total_spent = spending.total_spent
    profile.average_order_value = spending.average_order_value
    profile.last_order_date = spending.last_order_date
    profile.recent_orders = recent_orders
    profile.spending_overview = spending
    return profile


# ─────────────────────────────────────────────────────────────────────────────
# Analytics endpoint helper
# ─────────────────────────────────────────────────────────────────────────────

def get_customer_analytics(db: Session) -> Dict[str, Any]:
    total = db.query(func.count(Customer.id)).scalar() or 0
    active = db.query(func.count(Customer.id)).filter(Customer.is_active.is_(True)).scalar() or 0
    inactive = total - active

    # New customers this month - dialect-aware for SQLite compatibility
    if db.bind.dialect.name == "sqlite":
        new_this_month = (
            db.query(func.count(Customer.id))
            .filter(func.strftime("%Y-%m", Customer.created_at) == func.strftime("%Y-%m", func.now()))
            .scalar()
            or 0
        )
    else:
        new_this_month = (
            db.query(func.count(Customer.id))
            .filter(func.date_trunc("month", Customer.created_at) == func.date_trunc("month", func.now()))
            .scalar()
            or 0
        )

    # Top spenders (email join)
    stats_sq = _build_order_stats_subquery(db)
    top_spenders = (
        db.query(
            Customer.id,
            Customer.first_name,
            Customer.last_name,
            Customer.email,
            stats_sq.c.total_spent,
            stats_sq.c.total_orders,
        )
        .outerjoin(stats_sq, Customer.email == stats_sq.c.customer_email)
        .filter(stats_sq.c.total_spent.isnot(None))
        .order_by(stats_sq.c.total_spent.desc())
        .limit(5)
        .all()
    )

    return {
        "total_customers": total,
        "active_customers": active,
        "inactive_customers": inactive,
        "new_this_month": new_this_month,
        "top_spenders": [
            {
                "id": r.id,
                "name": f"{r.first_name} {r.last_name}",
                "email": r.email,
                "total_spent": float(r.total_spent or 0),
                "total_orders": int(r.total_orders or 0),
            }
            for r in top_spenders
        ],
    }
