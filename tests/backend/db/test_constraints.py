import pytest
from sqlalchemy.exc import IntegrityError
from backend.app.modules.customers.models import Customer
from backend.app.modules.products.models import Product, ProductVariant

def test_unique_customer_email_constraint(db_session):
    # Setup: Create first customer
    c1 = Customer(
        first_name="Alice",
        last_name="One",
        email="duplicate@example.com",
        is_active=True
    )
    db_session.add(c1)
    db_session.commit()

    # Attempt to create second customer with same email
    c2 = Customer(
        first_name="Alice",
        last_name="Two",
        email="duplicate@example.com",
        is_active=True
    )
    db_session.add(c2)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()

def test_variant_stock_non_negative_check_constraint(db_session):
    product = Product(title="Constraint Tee", slug="constraint-tee")
    db_session.add(product)
    db_session.commit()

    # Stock quantity must be >= 0
    v = ProductVariant(
        product_id=product.id,
        sku="CON-TEE-NEG",
        size="M",
        original_price=20.00,
        selling_price=20.00,
        stock_quantity=-5
    )
    db_session.add(v)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()

def test_variant_prices_check_constraint(db_session):
    product = Product(title="Constraint Pants", slug="constraint-pants")
    db_session.add(product)
    db_session.commit()

    # original_price must be positive
    v1 = ProductVariant(
        product_id=product.id,
        sku="CON-PNT-ZERO-ORIG",
        size="M",
        original_price=0.00,
        selling_price=10.00,
        stock_quantity=10
    )
    db_session.add(v1)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()

    # selling_price must be <= original_price
    v2 = ProductVariant(
        product_id=product.id,
        sku="CON-PNT-HIGH-SELL",
        size="M",
        original_price=10.00,
        selling_price=15.00,
        stock_quantity=10
    )
    db_session.add(v2)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()

def test_cascade_delete_product_deletes_variants(db_session):
    product = Product(title="Cascade Tee", slug="cascade-tee")
    db_session.add(product)
    db_session.commit()

    v = ProductVariant(
        product_id=product.id,
        sku="CAS-TEE-M",
        size="M",
        original_price=10.00,
        selling_price=10.00,
        stock_quantity=10
    )
    db_session.add(v)
    db_session.commit()

    variant_id = v.id

    # Delete product
    db_session.delete(product)
    db_session.commit()

    # Check that variant is gone due to CASCADE
    db_var = db_session.query(ProductVariant).filter(ProductVariant.id == variant_id).first()
    assert db_var is None
