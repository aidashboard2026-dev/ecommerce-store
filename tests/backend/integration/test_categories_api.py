import pytest
from fastapi import status

def test_category_crud_flow(client, admin_headers, db_session):
    # 1. Create category
    cat_data = {
        "name": "Hoodies",
        "slug": "hoodies",
        "description": "Warm winter hoodies",
        "status": "active",
        "sort_order": 1
    }
    response = client.post("/api/v1/products/admin/categories", json=cat_data, headers=admin_headers)
    assert response.status_code == status.HTTP_201_CREATED
    cat_json = response.json()
    assert cat_json["name"] == "Hoodies"
    assert cat_json["slug"] == "hoodies"
    cat_id = cat_json["id"]

    # 2. Get categories list (public)
    list_response = client.get("/api/v1/products/categories")
    assert list_response.status_code == status.HTTP_200_OK
    assert any(c["slug"] == "hoodies" for c in list_response.json())

    # 3. Patch category
    patch_data = {"description": "Updated winter hoodies description"}
    patch_response = client.patch(
        f"/api/v1/products/admin/categories/{cat_id}",
        json=patch_data,
        headers=admin_headers
    )
    assert patch_response.status_code == status.HTTP_200_OK
    assert patch_response.json()["description"] == "Updated winter hoodies description"

    # 4. Create a collection inside this category
    coll_data = {
        "category_id": cat_id,
        "name": "Heavy Hoodies Collection",
        "slug": "heavy-hoodies",
        "description": "Premium 400gsm heavy hoodies",
        "status": "active"
    }
    coll_response = client.post("/api/v1/products/admin/collections", json=coll_data, headers=admin_headers)
    assert coll_response.status_code == status.HTTP_201_CREATED
    coll_json = coll_response.json()
    assert coll_json["name"] == "Heavy Hoodies Collection"
    coll_id = coll_json["id"]

    # 5. Delete collection
    del_coll = client.delete(f"/api/v1/products/admin/collections/{coll_id}", headers=admin_headers)
    assert del_coll.status_code == status.HTTP_204_NO_CONTENT

    # 6. Delete category
    del_cat = client.delete(f"/api/v1/products/admin/categories/{cat_id}", headers=admin_headers)
    assert del_cat.status_code == status.HTTP_204_NO_CONTENT
