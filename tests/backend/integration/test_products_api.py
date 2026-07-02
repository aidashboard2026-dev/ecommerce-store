import pytest
from fastapi import status
from backend.app.modules.products.models import Product, ProductVariant

def test_admin_product_crud_flow(client, admin_headers, db_session):
    # 1. Create a Product
    product_data = {
        "title": "Aura Premium T-Shirt",
        "slug": "aura-premium-t-shirt",
        "description": "High quality cotton t-shirt",
        "short_description": "Soft and durable shirt",
        "is_featured": True,
        "tags": ["cotton", "shirt"],
        "status": "draft",
        "category_id": None,
        "collection_id": None,
        "material": "100% Cotton",
        "variants": []
    }
    
    response = client.post("/api/v1/products/admin", json=product_data, headers=admin_headers)
    assert response.status_code == status.HTTP_201_CREATED
    prod_json = response.json()
    assert prod_json["title"] == "Aura Premium T-Shirt"
    assert prod_json["slug"] == "aura-premium-t-shirt"
    product_id = prod_json["id"]

    # 2. Add Variant to Product
    variant_data = {
        "sku": "AURA-TSHIRT-BLK-M",
        "size": "M",
        "color": "Black",
        "color_hex": "#000000",
        "original_price": 49.99,
        "selling_price": 39.99,
        "stock_quantity": 50,
        "low_stock_threshold": 5
    }
    
    var_response = client.post(
        f"/api/v1/products/admin/{product_id}/variants", 
        json=variant_data, 
        headers=admin_headers
    )
    assert var_response.status_code == status.HTTP_200_OK
    updated_prod = var_response.json()
    assert len(updated_prod["variants"]) == 1
    assert updated_prod["variants"][0]["sku"] == "AURA-TSHIRT-BLK-M"
    variant_id = updated_prod["variants"][0]["id"]

    # 3. Public get by slug
    # It is draft, so public catalog listing should not show it? Let's check status behavior.
    # In service/repository, draft is excluded from public routes.
    # But admin-specific fetch should work:
    admin_get = client.get(f"/api/v1/products/admin/{product_id}", headers=admin_headers)
    assert admin_get.status_code == status.HTTP_200_OK
    assert admin_get.json()["title"] == "Aura Premium T-Shirt"

    # 4. Patch Product Status (publish it)
    patch_data = {"status": "published"}
    patch_response = client.patch(
        f"/api/v1/products/admin/{product_id}", 
        json=patch_data, 
        headers=admin_headers
    )
    assert patch_response.status_code == status.HTTP_200_OK
    assert patch_response.json()["status"] == "published"

    # Now public slug fetch should work
    pub_get = client.get(f"/api/v1/products/slug/aura-premium-t-shirt")
    assert pub_get.status_code == status.HTTP_200_OK
    assert pub_get.json()["title"] == "Aura Premium T-Shirt"

    # 5. Delete Product Variant
    del_var_response = client.delete(
        f"/api/v1/products/admin/{product_id}/variants/{variant_id}",
        headers=admin_headers
    )
    assert del_var_response.status_code == status.HTTP_200_OK
    assert len(del_var_response.json()["variants"]) == 0

    # 6. Delete Product
    del_response = client.delete(f"/api/v1/products/admin/{product_id}", headers=admin_headers)
    assert del_response.status_code == status.HTTP_204_NO_CONTENT

    # Verify product is soft-deleted or removed from queries
    check_get = client.get(f"/api/v1/products/admin/{product_id}", headers=admin_headers)
    assert check_get.status_code == status.HTTP_404_NOT_FOUND
