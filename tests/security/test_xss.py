import pytest
from fastapi import status

XSS_PAYLOADS = [
    "<script>alert('XSS')</script>",
    "<img src=x onerror=alert(1)>",
    "javascript:alert(1)",
    "';alert(1)//",
    "<svg/onload=alert(1)>"
]

def test_category_xss_prevention(client, admin_headers):
    for payload in XSS_PAYLOADS:
        # Create a category with XSS payload as description
        cat_data = {
            "name": f"Cat-{payload[:10]}",
            "slug": f"cat-{hash(payload)}",
            "description": payload,
            "status": "active",
            "sort_order": 0
        }
        response = client.post("/api/v1/products/admin/categories", json=cat_data, headers=admin_headers)
        assert response.status_code == status.HTTP_201_CREATED
        cat_json = response.json()
        
        # Verify the payload is preserved as a literal (escaped on client side, not stripped or executed by backend)
        assert cat_json["description"] == payload

        # Clean up
        client.delete(f"/api/v1/products/admin/categories/{cat_json['id']}", headers=admin_headers)
