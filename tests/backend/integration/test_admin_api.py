import pytest
from fastapi import status

def test_admin_management_permissions_and_crud(client, admin_headers, superadmin_headers, db_session):
    # 1. Non-superadmin admin tries to create another admin (should fail with 403)
    create_payload = {
        "name": "New Admin",
        "email": "new_admin@example.com",
        "password": "strongpass123",
        "role": "admin"
    }
    response = client.post("/api/v1/admins/", json=create_payload, headers=admin_headers)
    assert response.status_code == status.HTTP_403_FORBIDDEN

    # 2. Superadmin creates a new admin (should succeed)
    response = client.post("/api/v1/admins/", json=create_payload, headers=superadmin_headers)
    assert response.status_code == status.HTTP_201_CREATED
    new_admin_data = response.json()
    new_admin_id = new_admin_data["id"]
    assert new_admin_data["email"] == "new_admin@example.com"

    # 3. Read admin list as standard admin (should succeed)
    list_response = client.get("/api/v1/admins/", headers=admin_headers)
    assert list_response.status_code == status.HTTP_200_OK
    assert len(list_response.json()) >= 2  # fixture admin + new admin + superadmin

    # 4. Standard admin updates own details (should succeed)
    # We need the ID of the standard admin. But standard admin has endpoint get_me
    me_resp = client.get("/api/v1/auth/me", headers=admin_headers)
    assert me_resp.status_code == status.HTTP_200_OK
    me_id = me_resp.json()["id"]

    update_payload = {
        "name": "Updated Admin Name"
    }
    update_resp = client.put(f"/api/v1/admins/{me_id}", json=update_payload, headers=admin_headers)
    assert update_resp.status_code == status.HTTP_200_OK
    assert update_resp.json()["name"] == "Updated Admin Name"

    # 5. Standard admin tries to update another admin (should fail with 403)
    update_fail = client.put(f"/api/v1/admins/{new_admin_id}", json={"name": "Hacked"}, headers=admin_headers)
    assert update_fail.status_code == status.HTTP_403_FORBIDDEN

    # 6. Standard admin tries to delete admin (should fail with 403)
    del_fail = client.delete(f"/api/v1/admins/{new_admin_id}", headers=admin_headers)
    assert del_fail.status_code == status.HTTP_403_FORBIDDEN

    # 7. Superadmin deletes admin (should succeed)
    del_success = client.delete(f"/api/v1/admins/{new_admin_id}", headers=superadmin_headers)
    assert del_success.status_code == status.HTTP_200_OK
    assert del_success.json()["message"] == "Admin deleted successfully"
