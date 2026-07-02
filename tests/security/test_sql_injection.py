import pytest
from fastapi import status

# Standard SQL Injection payloads
SQLI_PAYLOADS = [
    "' OR '1'='1",
    "'; DROP TABLE users; --",
    "1' UNION SELECT NULL, NULL, NULL --",
    "admin' --",
    "' OR 1=1 LIMIT 1 --"
]

def test_login_api_safe_from_sqli(client):
    for payload in SQLI_PAYLOADS:
        # Test standard admin login route
        response = client.post("/api/v1/auth/login", json={
            "email": payload,
            "password": "somepassword"
        })
        # Should return 401 Unauthorized or 422 Validation Error, never 500 Internal Server Error
        assert response.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_422_UNPROCESSABLE_ENTITY)
        assert response.status_code != status.HTTP_500_INTERNAL_SERVER_ERROR

        # Test customer login route
        cust_response = client.post("/api/v1/auth/customer/login", json={
            "email": payload,
            "password": "somepassword"
        })
        assert cust_response.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_422_UNPROCESSABLE_ENTITY)
        assert cust_response.status_code != status.HTTP_500_INTERNAL_SERVER_ERROR

def test_product_search_safe_from_sqli(client):
    for payload in SQLI_PAYLOADS:
        # Search queries go through /products/ or /products/admin/all
        response = client.get(f"/api/v1/products/?search={payload}")
        # SQLAlchemy handles queries with binding parameters, so it returns empty list (no match) instead of breaking
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["total"] == 0
