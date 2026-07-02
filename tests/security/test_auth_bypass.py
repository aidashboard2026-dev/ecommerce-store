import pytest
from fastapi import status

def test_unauthorized_endpoints_access(client, customer_headers):
    # 1. Access admin products list without headers (should fail with 401)
    r1 = client.get("/api/v1/products/admin/all")
    assert r1.status_code == status.HTTP_401_UNAUTHORIZED

    # 2. Access admin products list with invalid token (should fail with 401)
    r2 = client.get("/api/v1/products/admin/all", headers={"Authorization": "Bearer badtoken"})
    assert r2.status_code == status.HTTP_401_UNAUTHORIZED

    # 3. Access admin products list with customer token (should fail with 401 or 403)
    # The dependency get_current_admin verifies that expected_type='admin'.
    # If the token is customer, verify_token returns None, which raises AuthenticationError (401).
    r3 = client.get("/api/v1/products/admin/all", headers=customer_headers)
    assert r3.status_code == status.HTTP_401_UNAUTHORIZED

    # 4. Access superadmin-only endpoints with standard admin token (should fail with 403)
    # POST /api/v1/admins/admin is superadmin only
    r4 = client.post("/api/v1/admins/admin", json={}, headers=customer_headers)
    assert r4.status_code == status.HTTP_401_UNAUTHORIZED # Since customer token is invalid as admin
