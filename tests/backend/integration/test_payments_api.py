import pytest
from fastapi import status
from backend.app.modules.orders.models import Order

def test_order_payment_status_transitions(client, admin_headers, db_session):
    # Setup: Create a test order
    order = Order(
        order_number="PAY-12345",
        customer_name="John Buyer",
        customer_email="buyer@example.com",
        product_name="Sample Product",
        quantity=1,
        price=10.0,
        total_amount=10.0,
        payment_method="COD",
        payment_status="PENDING",
        tracking_status="PLACED"
    )
    db_session.add(order)
    db_session.commit()

    # 1. Update payment status to PAID via admin orders endpoint
    update_payload = {"payment_status": "PAID"}
    response = client.put(
        f"/api/v1/orders/{order.id}",
        json=update_payload,
        headers=admin_headers
    )
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["payment_status"] == "PAID"

    # 2. Transition payment status to REFUNDED to trigger refund emails/logics
    refund_payload = {"payment_status": "REFUNDED"}
    refund_response = client.put(
        f"/api/v1/orders/{order.id}",
        json=refund_payload,
        headers=admin_headers
    )
    assert refund_response.status_code == status.HTTP_200_OK
    assert refund_response.json()["payment_status"] == "REFUNDED"
