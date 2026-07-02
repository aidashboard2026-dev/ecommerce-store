import pytest
from fastapi import status
from io import BytesIO
from app.modules.products.models import Product, Category

def test_file_upload_security_checks(client, admin_headers, db_session):
    # Setup: Create category and product
    cat = Category(name="Jeans", slug="jeans", status="active")
    db_session.add(cat)
    db_session.commit()

    product = Product(
        title="Slim Fit Jeans",
        slug="slim-fit-jeans",
        description="Blue jeans",
        status="published",
        category_id=cat.id
    )
    db_session.add(product)
    db_session.commit()

    product_id = product.id

    # 1. Invalid MIME type (e.g., text/plain)
    response = client.post(
        f"/api/v1/products/admin/{product_id}/images",
        headers=admin_headers,
        files={"file": ("test.png", BytesIO(b"dummy content"), "text/plain")},
        data={"image_type": "thumbnail"}
    )
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    assert "Only JPG, PNG, and WebP are allowed" in response.json()["detail"]

    # 2. Invalid Extension (e.g., test.txt)
    response = client.post(
        f"/api/v1/products/admin/{product_id}/images",
        headers=admin_headers,
        files={"file": ("test.txt", BytesIO(b"dummy content"), "image/png")},
        data={"image_type": "thumbnail"}
    )
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    assert "Extension" in response.json()["detail"]

    # 3. Invalid Magic Bytes (file named test.png with image/png MIME but text content)
    response = client.post(
        f"/api/v1/products/admin/{product_id}/images",
        headers=admin_headers,
        files={"file": ("test.png", BytesIO(b"not a png image content"), "image/png")},
        data={"image_type": "thumbnail"}
    )
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    assert "File content does not match any supported image format" in response.json()["detail"]

    # 4. Oversized file (exceeds MAX_IMAGE_SIZE, e.g. 6 MB)
    large_data = b"B" * (6 * 1024 * 1024)
    response = client.post(
        f"/api/v1/products/admin/{product_id}/images",
        headers=admin_headers,
        files={"file": ("test.png", BytesIO(large_data), "image/png")},
        data={"image_type": "thumbnail"}
    )
    assert response.status_code == status.HTTP_413_REQUEST_ENTITY_TOO_LARGE

    # 5. Valid PNG image (correct signature: 89 50 4E 47 0D 0A 1A 0A)
    png_signature = b"\x89PNG\r\n\x1a\n" + b"some extra data"
    # We mock Supabase storage upload if it's going to call upload_product_image.
    # Wait, the client is FastAPI TestClient, meaning it calls supabase_storage.upload_product_image.
    # Since we don't have a mock for supabase_storage, and calling it might fail without real credentials,
    # let's mock it in the test itself or verify that the check gets passed.
    # To mock supabase_storage, we can patch `app.shared.storage.supabase_storage.upload_product_image`
    from unittest.mock import patch
    with patch("app.modules.products.router.supabase_storage.upload_product_image") as mock_upload:
        mock_upload.return_value = "http://example.com/test.png"
        response = client.post(
            f"/api/v1/products/admin/{product_id}/images",
            headers=admin_headers,
            files={"file": ("test.png", BytesIO(png_signature), "image/png")},
            data={"image_type": "thumbnail"}
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["image_type"] == "thumbnail"
