import pytest
from fastapi import status
from decimal import Decimal
from backend.app.modules.products.models import Product, ProductVariant
from backend.app.modules.orders.models import Order

def test_order_lifecycle_integration(client, admin_headers, customer_headers, db_session):
    # Setup: Create a product and a variant with stock to test stock decrement
    product = Product(
        title="Test Track Pants",
        slug="test-track-pants",
        description="Warm joggers",
        status="published"
    )
    db_session.add(product)
    db_session.flush()

    variant = ProductVariant(
        product_id=product.id,
        sku="PANTS-GRY-M",
        size="M",
        color="Grey",
        original_price=59.99,
        selling_price=49.99,
        stock_quantity=10,
        reserved_stock=0,
        low_stock_threshold=2
    )
    db_session.add(variant)
    db_session.commit()

    # 1. Storefront Path: Customer places an order
    order_payload = {
        "customer_name": "Test Customer",  # Will be overridden by customer me details
        "product_name": "Test Track Pants",
        "product_id": product.id,
        "size": "M",
        "color": "Grey",
        "quantity": 2,
        "price": "49.99",
        "total_amount": "99.98",
        "payment_method": "COD",
        "city": "Mumbai"
    }

    cust_order_response = client.post(
        "/api/v1/orders/customer", 
        json=order_payload, 
        headers=customer_headers
    )
    assert cust_order_response.status_code == status.HTTP_201_CREATED
    order_json = cust_order_response.json()
    assert order_json["product_name"] == "Test Track Pants"
    assert order_json["quantity"] == 2
    order_id = order_json["id"]
    order_number = order_json["order_number"]

    # Refresh variant stock - should be decremented by 2
    db_session.expire(variant)
    assert variant.stock_quantity == 8

    # 2. Public Tracking Path: Track by order number
    track_response = client.get(f"/api/v1/orders/track/{order_number}")
    assert track_response.status_code == status.HTTP_200_OK
    track_json = track_response.json()
    assert track_json["order_number"] == order_number
    assert "customer_email" not in track_json  # Ensure no PII leaked

    # 3. Customer views their order history
    history_response = client.get("/api/v1/orders/customer/all", headers=customer_headers)
    assert history_response.status_code == status.HTTP_200_OK
    assert history_response.json()["total"] >= 1

    # 4. Customer views specific order
    details_response = client.get(f"/api/v1/orders/customer/{order_id}", headers=customer_headers)
    assert details_response.status_code == status.HTTP_200_OK

    # 5. Admin Path: Admin lists all orders
    admin_list = client.get("/api/v1/orders/", headers=admin_headers)
    assert admin_list.status_code == status.HTTP_200_OK
    assert admin_list.json()["total"] >= 1

    # 6. Admin Path: Update tracking status (Transition to SHIPPED)
    status_payload = {
        "tracking_status": "SHIPPED",
        "logistics": "BlueDart",
        "tracking_id": "BD12345678"
    }
    update_response = client.put(
        f"/api/v1/orders/{order_id}", 
        json=status_payload, 
        headers=admin_headers
    )
    assert update_response.status_code == status.HTTP_200_OK
    assert update_response.json()["tracking_status"] == "SHIPPED"

    # 7. Customer tries to cancel shipped order (should be rejected)
    cancel_fail_response = client.post(
        f"/api/v1/orders/customer/{order_id}/cancel", 
        headers=customer_headers
    )
    assert cancel_fail_response.status_code == status.HTTP_400_BAD_REQUEST
    assert "shipped or delivered" in cancel_fail_response.json()["error"]

    # 8. Admin cancels the order anyway (Admin has override bypass)
    admin_cancel_response = client.post(
        f"/api/v1/orders/{order_id}/cancel", 
        headers=admin_headers
    )
    assert admin_cancel_response.status_code == status.HTTP_200_OK
    assert admin_cancel_response.json()["tracking_status"] == "CANCELLED"

    # Verify inventory is restored by 2 (original 10)
    db_session.expire(variant)
    assert variant.stock_quantity == 10
