import pytest
from fastapi import status
from datetime import date
from backend.app.modules.customers.models import Customer
from backend.app.core.security import get_password_hash

def test_customer_signup_and_login_flow(client, db_session):
    # 1. Signup a new customer
    signup_data = {
        "first_name": "Jane",
        "last_name": "Doe",
        "email": "jane.doe@example.com",
        "dob": "1992-08-24",
        "password": "strongpassword123",
        "phone": "9876543210"
    }
    response = client.post("/api/v1/auth/signup", json=signup_data)
    assert response.status_code == status.HTTP_201_CREATED
    resp_json = response.json()
    assert resp_json["customer"]["email"] == "jane.doe@example.com"
    
    # 2. Query DB to verify customer state
    cust_db = db_session.query(Customer).filter(Customer.email == "jane.doe@example.com").first()
    assert cust_db is not None
    assert cust_db.is_active is True
    # For storefront authentication, let's mark email verified
    cust_db.email_verified = True
    db_session.commit()

    # 3. Attempt customer login
    login_data = {
        "email": "jane.doe@example.com",
        "password": "strongpassword123"
    }
    login_response = client.post("/api/v1/auth/customer/login", json=login_data)
    assert login_response.status_code == status.HTTP_200_OK
    login_json = login_response.json()
    assert "access_token" in login_json
    assert login_json["customer"]["email"] == "jane.doe@example.com"

    # 4. Fetch customer profile with token
    headers = {"Authorization": f"Bearer {login_json['access_token']}"}
    profile_response = client.get("/api/v1/auth/customer/me", headers=headers)
    assert profile_response.status_code == status.HTTP_200_OK
    profile_json = profile_response.json()
    assert profile_json["first_name"] == "Jane"

def test_admin_login_and_me_flow(client, db_session):
    from backend.app.modules.admins.models import Admin
    # Setup admin
    admin = Admin(
        name="System Admin",
        email="sys_admin@example.com",
        password_hash=get_password_hash("adminpassword123"),
        role="admin"
    )
    db_session.add(admin)
    db_session.commit()

    # Login admin
    login_data = {"email": "sys_admin@example.com", "password": "adminpassword123"}
    response = client.post("/api/v1/auth/login", json=login_data)
    assert response.status_code == status.HTTP_200_OK
    token_data = response.json()
    assert "access_token" in token_data

    # Fetch admin me
    headers = {"Authorization": f"Bearer {token_data['access_token']}"}
    me_response = client.get("/api/v1/auth/me", headers=headers)
    assert me_response.status_code == status.HTTP_200_OK
    assert me_response.json()["email"] == "sys_admin@example.com"
