import pytest
from fastapi import status

def test_settings_endpoints_flow(client, admin_headers):
    # 1. Fetch public settings (no auth)
    public_response = client.get("/api/v1/settings/public")
    assert public_response.status_code == status.HTTP_200_OK
    assert "store_name" in public_response.json()

    # 2. Fetch business limits (requires admin token)
    limits_response = client.get("/api/v1/settings/business-limits", headers=admin_headers)
    assert limits_response.status_code == status.HTTP_200_OK
    assert "max_products" in limits_response.json()

    # 3. Fetch regional options (no auth)
    regional_response = client.get("/api/v1/settings/regional-options")
    assert regional_response.status_code == status.HTTP_200_OK
    assert "countries" in regional_response.json()

    # 4. Fetch full settings bundle (admin only)
    bundle_response = client.get("/api/v1/settings", headers=admin_headers)
    assert bundle_response.status_code == status.HTTP_200_OK
    assert "store_settings" in bundle_response.json()

    # 5. Update settings profile (admin only)
    update_payload = {
        "store_name": "AuraStore Test Brand",
        "support_email": "support-test@aurastore.com"
    }
    update_response = client.put("/api/v1/settings/profile", json=update_payload, headers=admin_headers)
    assert update_response.status_code == status.HTTP_200_OK
    assert update_response.json()["store_name"] == "AuraStore Test Brand"
    assert update_response.json()["support_email"] == "support-test@aurastore.com"
