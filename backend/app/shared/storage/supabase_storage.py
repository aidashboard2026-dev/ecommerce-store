"""
Supabase Storage service
─────────────────────────────────────────────────────────────────────────
Centralizes every interaction with Supabase Storage so the rest of the
codebase never talks to the Supabase REST API directly. All product and
banner image uploads/deletes go through this module.

Talks to the Storage HTTP API directly (no supabase-py dependency needed):
    POST   {SUPABASE_URL}/storage/v1/object/{bucket}/{path}   → upload
    DELETE {SUPABASE_URL}/storage/v1/object/{bucket}/{path}   → delete
Public URL shape (for public buckets):
    {SUPABASE_URL}/storage/v1/object/public/{bucket}/{path}

All credentials/bucket names are read from app.core.config.settings, which
in turn reads them from the environment (.env). Nothing is hardcoded here.
"""

import uuid
import os
from typing import Optional
import logging

import httpx
from fastapi import HTTPException, status

from app.core.config import settings

logger = logging.getLogger(__name__)

_STORAGE_BASE = f"{settings.SUPABASE_URL.rstrip('/')}/storage/v1" if settings.SUPABASE_URL else ""
_TIMEOUT = httpx.Timeout(30.0, connect=10.0)


# ─────────────────────────────────────────────────────────────
# Internal helpers
# ─────────────────────────────────────────────────────────────

def is_supabase_configured() -> bool:
    """Check if Supabase Storage environment variables are fully configured."""
    return bool(settings.SUPABASE_URL and settings.SUPABASE_SERVICE_ROLE_KEY)


def _auth_headers(content_type: Optional[str] = None) -> dict:
    """
    Service-role headers — required so uploads/deletes work regardless of
    bucket RLS policies. This key must NEVER be sent to the frontend.
    """
    headers = {
        "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
        "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
    }
    if content_type:
        headers["Content-Type"] = content_type
    return headers


def _generate_unique_filename(original_filename: str, prefix: str = "") -> str:
    """
    Generates a collision-proof object name while preserving the original
    file extension. Prefixing with an entity id (e.g. product id) keeps
    related files easy to recognize in the Supabase dashboard.
    """
    ext = os.path.splitext(original_filename or "")[1].lower() or ".jpg"
    unique = uuid.uuid4().hex
    return f"{prefix}{unique}{ext}" if prefix else f"{unique}{ext}"


def get_public_url(bucket: str, object_path: str) -> str:
    """Builds the public URL for an object in a public bucket."""
    return f"{settings.SUPABASE_URL.rstrip('/')}/storage/v1/object/public/{bucket}/{object_path}"


def _object_path_from_public_url(public_url: str, bucket: str) -> Optional[str]:
    """
    Reverses get_public_url() so we know exactly what to delete from
    Supabase when a product/banner image is replaced or removed.
    Returns None if the URL doesn't match the expected public-URL shape
    (e.g. it's a legacy local path like /uploads/products/old.jpg —
    nothing to delete from Supabase in that case).
    """
    if not public_url:
        return None
    marker = f"/object/public/{bucket}/"
    idx = public_url.find(marker)
    if idx == -1:
        return None
    return public_url[idx + len(marker):]


def _upload_object(bucket: str, object_path: str, contents: bytes, content_type: str) -> str:
    """
    Uploads bytes to Supabase Storage and returns the resulting public URL.
    Object names are always freshly generated UUIDs, so a plain POST
    (create) is safe — there should never be a collision.
    """
    url = f"{_STORAGE_BASE}/object/{bucket}/{object_path}"
    try:
        response = httpx.post(
            url,
            headers=_auth_headers(content_type),
            content=contents,
            timeout=_TIMEOUT,
        )
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Could not reach Supabase Storage: {exc}",
        )

    if response.status_code not in (200, 201):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=(
                f"Supabase Storage upload failed ({response.status_code}): "
                f"{response.text}"
            ),
        )

    return get_public_url(bucket, object_path)


def _delete_object(bucket: str, object_path: str) -> None:
    """
    Best-effort delete — mirrors the rest of the codebase's pattern of
    never letting cleanup failures break the calling request (e.g. an
    admin who replaces an image shouldn't see an error just because the
    old file was already gone from the bucket).
    """
    url = f"{_STORAGE_BASE}/object/{bucket}/{object_path}"
    try:
        httpx.request(
            "DELETE",
            url,
            headers=_auth_headers(),
            timeout=_TIMEOUT,
        )
    except httpx.HTTPError:
        pass


# ─────────────────────────────────────────────────────────────
# Public API — product images
# ─────────────────────────────────────────────────────────────

def ensure_placeholder_image() -> None:
    """Guarantees that a fallback placeholder image is available locally."""
    path = os.path.join(settings.UPLOAD_DIR, "placeholder-product.png")
    if not os.path.exists(path):
        import base64
        # A simple, valid 150x150 gray square PNG placeholder
        data = (
            b"iVBORw0KGgoAAAANSUhEUgAAAJYAAACWAQMAAAAGz+5lAAAAA1BMVEXz8/PX"
            b"19cAAAAAXRSTlMAQObYZgAAABpJREFUeN7twQENAAAAwiD7p7bHBwwAAAAg"
            b"7AD+AAFv1E2JAAAAAElFTkSuQmCC"
        )
        try:
            os.makedirs(os.path.dirname(path), exist_ok=True)
            with open(path, "wb") as f:
                f.write(base64.b64decode(data))
        except Exception as exc:
            logger.warning("Could not write local placeholder product image: %s", exc)


def get_product_image_url(object_path_or_url: Optional[str]) -> Optional[str]:
    """Generates the Supabase Public URL dynamically or returns the fallback placeholder."""
    # Ensure local placeholder exists
    ensure_placeholder_image()
    placeholder_url = "/uploads/placeholder-product.png"

    if not object_path_or_url:
        return placeholder_url

    # If it is a full URL
    if object_path_or_url.startswith("http://") or object_path_or_url.startswith("https://"):
        if is_supabase_configured():
            path = _object_path_from_public_url(object_path_or_url, settings.SUPABASE_PRODUCT_BUCKET)
            if path:
                return get_public_url(settings.SUPABASE_PRODUCT_BUCKET, path)
        return object_path_or_url

    # If it is a local fallback path
    if object_path_or_url.startswith("/uploads/"):
        return object_path_or_url

    # It's an object path! If Supabase is configured, return the public URL.
    if is_supabase_configured():
        return get_public_url(settings.SUPABASE_PRODUCT_BUCKET, object_path_or_url)

    # Local fallback for the object path
    local_path = f"/uploads/products/{object_path_or_url}"
    full_local_path = os.path.join(settings.UPLOAD_DIR, "products", object_path_or_url.replace("/", os.sep))
    if os.path.exists(full_local_path):
        return local_path

    return placeholder_url


def upload_product_image(
    contents: bytes,
    original_filename: str,
    content_type: str,
    product_id: Optional[int] = None,
    category_slug: Optional[str] = None,
    product_slug: Optional[str] = None,
    image_type: str = "thumbnail",
) -> str:
    """Uploads a product image and returns the stored relative path or local fallback path."""
    ext = os.path.splitext(original_filename or "")[1].lower() or ".jpg"

    # If new structured path details are provided
    if category_slug and product_slug:
        if image_type == "gallery":
            object_name = f"gallery_{uuid.uuid4().hex[:8]}{ext}"
        else:
            object_name = f"{image_type}{ext}"
        
        object_path = f"products/{category_slug}/{product_slug}/{object_name}"

        if not is_supabase_configured():
            logger.warning("Supabase Storage not configured. Falling back to local disk storage.")
            target_dir = os.path.join(settings.UPLOAD_DIR, "products", category_slug, product_slug)
            os.makedirs(target_dir, exist_ok=True)
            file_path = os.path.join(target_dir, object_name)
            with open(file_path, "wb") as f:
                f.write(contents)
            return f"/uploads/products/{category_slug}/{product_slug}/{object_name}"

        _upload_object(settings.SUPABASE_PRODUCT_BUCKET, object_path, contents, content_type)
        return object_path

    # Fallback/backward compatibility style
    if not is_supabase_configured():
        logger.warning("Supabase Storage not configured. Falling back to local disk storage.")
        pid = product_id if product_id is not None else "legacy"
        filename = f"{pid}_{uuid.uuid4().hex[:12]}{ext}"
        target_dir = os.path.join(settings.UPLOAD_DIR, "products")
        os.makedirs(target_dir, exist_ok=True)
        file_path = os.path.join(target_dir, filename)
        with open(file_path, "wb") as f:
            f.write(contents)
        return f"/uploads/products/{filename}"

    pid = product_id if product_id is not None else "legacy"
    object_path = _generate_unique_filename(original_filename, prefix=f"{pid}_")
    _upload_object(settings.SUPABASE_PRODUCT_BUCKET, object_path, contents, content_type)
    return object_path


def delete_product_image(image_url: Optional[str]) -> None:
    """Deletes a product image from Supabase or local storage given its URL or object path."""
    if not image_url:
        return

    # Check for local fallback path
    if image_url.startswith("/uploads/"):
        rel_path = image_url.lstrip("/").replace("uploads/", "", 1)
        file_path = os.path.normpath(os.path.join(settings.UPLOAD_DIR, rel_path))
        safe_prefix = os.path.normpath(settings.UPLOAD_DIR) + os.sep
        if file_path.startswith(safe_prefix) and os.path.exists(file_path):
            try:
                os.remove(file_path)
            except OSError:
                pass
        return

    if not is_supabase_configured():
        return

    if image_url.startswith("http://") or image_url.startswith("https://"):
        object_path = _object_path_from_public_url(image_url, settings.SUPABASE_PRODUCT_BUCKET)
    else:
        object_path = image_url

    if object_path:
        _delete_object(settings.SUPABASE_PRODUCT_BUCKET, object_path)


def delete_all_product_images(product) -> None:
    """Deletes all associated images (thumbnail, front, back, size_chart, gallery) of a product from storage."""
    if not product:
        return
    for attr in ["thumbnail", "image_front", "image_back", "image_size_chart"]:
        url = getattr(product, attr, None)
        if url:
            try:
                delete_product_image(url)
            except Exception as exc:
                logger.warning(f"Failed to delete product image {url}: {exc}")
    for url in getattr(product, "gallery_images", None) or []:
        if url:
            try:
                delete_product_image(url)
            except Exception as exc:
                logger.warning(f"Failed to delete product gallery image {url}: {exc}")


# ─────────────────────────────────────────────────────────────
# Public API — custom product images (SEPARATE from product images)
# Custom products use their own Supabase bucket to enforce domain isolation.
# Never call upload_product_image() for custom products — use these instead.
# ─────────────────────────────────────────────────────────────

def get_custom_product_image_url(object_path_or_url: Optional[str]) -> Optional[str]:
    """Generates the Supabase Public URL dynamically or returns the fallback placeholder."""
    ensure_placeholder_image()
    placeholder_url = "/uploads/placeholder-product.png"

    if not object_path_or_url:
        return placeholder_url

    # If it is a full URL
    if object_path_or_url.startswith("http://") or object_path_or_url.startswith("https://"):
        if is_supabase_configured():
            path = _object_path_from_public_url(object_path_or_url, settings.SUPABASE_CUSTOM_PRODUCT_BUCKET)
            if path:
                return get_public_url(settings.SUPABASE_CUSTOM_PRODUCT_BUCKET, path)
        return object_path_or_url

    # If it is a local fallback path
    if object_path_or_url.startswith("/uploads/"):
        return object_path_or_url

    # It's an object path! If Supabase is configured, return the public URL.
    if is_supabase_configured():
        return get_public_url(settings.SUPABASE_CUSTOM_PRODUCT_BUCKET, object_path_or_url)

    # Local fallback for the object path
    local_path = f"/uploads/custom_products/{object_path_or_url}"
    full_local_path = os.path.join(settings.UPLOAD_DIR, "custom_products", object_path_or_url.replace("/", os.sep))
    if os.path.exists(full_local_path):
        return local_path

    return placeholder_url


def upload_custom_product_image(
    contents: bytes,
    original_filename: str,
    content_type: str,
    product_id: int,
) -> str:
    """Uploads a custom product image to the dedicated custom-product-images bucket.

    Returns the public Supabase URL or a local fallback path under
    uploads/custom_products/. This function MUST NOT be called for regular
    products — it uses a completely separate storage bucket.
    """
    if not is_supabase_configured():
        logger.warning("Supabase Storage not configured. Falling back to local disk storage.")
        ext = os.path.splitext(original_filename or "")[1].lower() or ".jpg"
        filename = f"{product_id}_{uuid.uuid4().hex[:12]}{ext}"
        target_dir = os.path.join(settings.UPLOAD_DIR, "custom_products")
        os.makedirs(target_dir, exist_ok=True)
        file_path = os.path.join(target_dir, filename)
        with open(file_path, "wb") as f:
            f.write(contents)
        return f"/uploads/custom_products/{filename}"

    object_path = _generate_unique_filename(original_filename, prefix=f"cp_{product_id}_")
    return _upload_object(settings.SUPABASE_CUSTOM_PRODUCT_BUCKET, object_path, contents, content_type)


def delete_custom_product_image(image_url: Optional[str]) -> None:
    """Deletes a custom product image from Supabase or local storage.

    Uses the custom-product-images bucket — never touches the product-images bucket.
    """
    if not image_url:
        return

    # Check for local fallback path
    if image_url.startswith("/uploads/"):
        filename = os.path.basename(image_url)
        if filename:
            file_path = os.path.normpath(os.path.join(settings.UPLOAD_DIR, "custom_products", filename))
            safe_prefix = os.path.normpath(os.path.join(settings.UPLOAD_DIR, "custom_products")) + os.sep
            if file_path.startswith(safe_prefix) and os.path.exists(file_path):
                try:
                    os.remove(file_path)
                except OSError:
                    pass
        return

    if not is_supabase_configured():
        return

    object_path = _object_path_from_public_url(image_url, settings.SUPABASE_CUSTOM_PRODUCT_BUCKET)
    if object_path:
        _delete_object(settings.SUPABASE_CUSTOM_PRODUCT_BUCKET, object_path)


def delete_all_custom_product_images(product) -> None:
    """Deletes all associated images (thumbnail, front, back, size_chart, gallery) of a custom product from storage."""
    if not product:
        return
    for attr in ["thumbnail", "image_front", "image_back", "image_size_chart"]:
        url = getattr(product, attr, None)
        if url:
            try:
                delete_custom_product_image(url)
            except Exception as exc:
                logger.warning(f"Failed to delete custom product image {url}: {exc}")
    for url in getattr(product, "gallery_images", None) or []:
        if url:
            try:
                delete_custom_product_image(url)
            except Exception as exc:
                logger.warning(f"Failed to delete custom product gallery image {url}: {exc}")


# ─────────────────────────────────────────────────────────────
# Public API — banner images
# ─────────────────────────────────────────────────────────────

def upload_banner_image(
    contents: bytes,
    original_filename: str,
    content_type: str,
) -> str:
    """Uploads a banner image and returns its public Supabase URL or local fallback path."""
    if not is_supabase_configured():
        logger.warning("Supabase Storage not configured. Falling back to local disk storage.")
        ext = os.path.splitext(original_filename or "")[1].lower() or ".jpg"
        filename = f"{uuid.uuid4().hex[:12]}{ext}"
        target_dir = os.path.join(settings.UPLOAD_DIR, "banners")
        os.makedirs(target_dir, exist_ok=True)
        file_path = os.path.join(target_dir, filename)
        with open(file_path, "wb") as f:
            f.write(contents)
        return f"/uploads/banners/{filename}"

    object_path = _generate_unique_filename(original_filename)
    return _upload_object(settings.SUPABASE_BANNER_BUCKET, object_path, contents, content_type)


def delete_banner_image(image_url: Optional[str]) -> None:
    """Deletes a banner image from Supabase or local storage given its stored public URL."""
    if not image_url:
        return

    # Check for local fallback path
    if image_url.startswith("/uploads/"):
        filename = os.path.basename(image_url)
        if filename:
            file_path = os.path.normpath(os.path.join(settings.UPLOAD_DIR, "banners", filename))
            safe_prefix = os.path.normpath(os.path.join(settings.UPLOAD_DIR, "banners")) + os.sep
            if file_path.startswith(safe_prefix) and os.path.exists(file_path):
                try:
                    os.remove(file_path)
                except OSError:
                    pass
        return

    if not is_supabase_configured():
        return

    object_path = _object_path_from_public_url(image_url, settings.SUPABASE_BANNER_BUCKET)
    if object_path:
        _delete_object(settings.SUPABASE_BANNER_BUCKET, object_path)


def delete_offer_image(image_url: Optional[str]) -> None:
    """Deletes an offer banner image from Supabase or local storage."""
    delete_banner_image(image_url)


# ─────────────────────────────────────────────────────────────
# Public API — store logo
# ─────────────────────────────────────────────────────────────

def upload_store_logo(
    contents: bytes,
    content_type: str,
) -> str:
    """Uploads/overwrites the store logo singleton in the 'branding' bucket.

    Returns the public Supabase URL.
    """
    if not is_supabase_configured():
        logger.error("Supabase Storage not configured. Cannot upload store logo.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Supabase Storage is not configured."
        )

    bucket = "branding"
    object_path = "logos/store-logo.png"

    # Best-effort delete first to prevent conflict/caching issues
    _delete_object(bucket, object_path)

    # Use x-upsert header to overwrite
    url = f"{_STORAGE_BASE}/object/{bucket}/{object_path}"
    headers = _auth_headers(content_type)
    headers["x-upsert"] = "true"

    try:
        response = httpx.post(
            url,
            headers=headers,
            content=contents,
            timeout=_TIMEOUT,
        )
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Could not reach Supabase Storage: {exc}",
        )

    if response.status_code not in (200, 201):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=(
                f"Supabase Storage upload failed ({response.status_code}): "
                f"{response.text}"
            ),
        )

    return get_public_url(bucket, object_path)


def delete_store_logo() -> None:
    """Deletes the store logo singleton from the 'branding' bucket."""
    if not is_supabase_configured():
        return
    _delete_object("branding", "logos/store-logo.png")


# ─────────────────────────────────────────────────────────────
# Public API — homepage category images
# ─────────────────────────────────────────────────────────────

def get_category_image_url(object_path_or_url: Optional[str]) -> Optional[str]:
    """Generates the Supabase Public URL dynamically or returns the fallback local path."""
    if not object_path_or_url:
        return ""

    # If it is a full URL
    if object_path_or_url.startswith("http://") or object_path_or_url.startswith("https://"):
        if is_supabase_configured():
            path = _object_path_from_public_url(object_path_or_url, settings.SUPABASE_CATEGORY_BUCKET)
            if path:
                return get_public_url(settings.SUPABASE_CATEGORY_BUCKET, path)
        return object_path_or_url

    # If it is a local fallback path
    if object_path_or_url.startswith("/uploads/"):
        return object_path_or_url

    # It's an object path! If Supabase is configured, return the public URL.
    if is_supabase_configured():
        return get_public_url(settings.SUPABASE_CATEGORY_BUCKET, object_path_or_url)

    # Local fallback for the object path
    local_path = f"/uploads/categories/{object_path_or_url}"
    full_local_path = os.path.join(settings.UPLOAD_DIR, "categories", object_path_or_url.replace("/", os.sep))
    if os.path.exists(full_local_path):
        return local_path

    return f"/uploads/categories/{object_path_or_url}"


def upload_category_image(
    contents: bytes,
    original_filename: str,
    content_type: str,
) -> str:
    """Uploads a homepage category image and returns the stored relative path or local fallback path."""
    ext = os.path.splitext(original_filename or "")[1].lower() or ".jpg"

    if not is_supabase_configured():
        logger.warning("Supabase Storage not configured. Falling back to local disk storage.")
        filename = f"{uuid.uuid4().hex[:12]}{ext}"
        target_dir = os.path.join(settings.UPLOAD_DIR, "categories")
        os.makedirs(target_dir, exist_ok=True)
        file_path = os.path.join(target_dir, filename)
        with open(file_path, "wb") as f:
            f.write(contents)
        return f"/uploads/categories/{filename}"

    object_path = _generate_unique_filename(original_filename)
    _upload_object(settings.SUPABASE_CATEGORY_BUCKET, object_path, contents, content_type)
    return object_path


def delete_category_image(image_url: Optional[str]) -> None:
    """Deletes a homepage category image from Supabase or local storage given its stored path or URL."""
    if not image_url:
        return

    # Check for local fallback path
    if image_url.startswith("/uploads/"):
        filename = os.path.basename(image_url)
        if filename:
            file_path = os.path.normpath(os.path.join(settings.UPLOAD_DIR, "categories", filename))
            safe_prefix = os.path.normpath(os.path.join(settings.UPLOAD_DIR, "categories")) + os.sep
            if file_path.startswith(safe_prefix) and os.path.exists(file_path):
                try:
                    os.remove(file_path)
                except OSError:
                    pass
        return

    if not is_supabase_configured():
        return

    if image_url.startswith("http://") or image_url.startswith("https://"):
        object_path = _object_path_from_public_url(image_url, settings.SUPABASE_CATEGORY_BUCKET)
    else:
        object_path = image_url

    if object_path:
        _delete_object(settings.SUPABASE_CATEGORY_BUCKET, object_path)


def check_object_exists(bucket: str, object_path: str) -> bool:
    """Checks if an object exists in the given Supabase bucket."""
    if not is_supabase_configured():
        return False
    url = f"{_STORAGE_BASE}/object/{bucket}/{object_path}"
    try:
        response = httpx.request(
            "HEAD",
            url,
            headers=_auth_headers(),
            timeout=_TIMEOUT,
        )
        return response.status_code == 200
    except httpx.HTTPError:
        return False


from urllib.parse import urlparse

def _extract_filename_and_path(val: str, bucket: str) -> tuple[str, Optional[str]]:
    """
    Extracts the clean filename and the relative object path from a URL or relative path.
    Returns (filename, relative_path).
    """
    if not val:
        return "", None
    
    parsed = urlparse(val)
    path_str = parsed.path
    filename = os.path.basename(path_str)
    
    if val.startswith("http://") or val.startswith("https://"):
        rel_path = _object_path_from_public_url(val, bucket)
        if rel_path:
            rel_path = urlparse(rel_path).path
            return filename, rel_path
            
    if val.startswith("/uploads/"):
        return filename, None
        
    rel_path = urlparse(val).path
    return filename, rel_path


def repair_database_images(db) -> dict:
    """
    Scans the products table and automatically repairs incorrect image paths
    if the files exist in Supabase storage under the structured path:
      products/<category-slug>/<product-slug>/<filename>
    """
    from app.modules.products.models import Product, Category
    
    products = db.query(Product).filter(Product.deleted_at.is_(None)).all()
    
    stats = {
        "total_scanned": len(products),
        "total_repaired": 0,
        "details": []
    }
    
    for p in products:
        repaired_any = False
        old_values = {}
        new_values = {}
        
        category_slug = None
        if p.category:
            category_slug = p.category.slug
        elif p.category_id:
            cat = db.get(Category, p.category_id)
            if cat:
                category_slug = cat.slug
                
        product_slug = p.slug
        
        if not category_slug or not product_slug:
            continue
            
        for attr in ["thumbnail", "image_front", "image_back", "image_size_chart"]:
            val = getattr(p, attr)
            if not val:
                continue
                
            if "placeholder-product" in val:
                continue
                
            filename, current_path = _extract_filename_and_path(val, settings.SUPABASE_PRODUCT_BUCKET)
            if not filename:
                continue
                
            reconstructed_path = f"products/{category_slug}/{product_slug}/{filename}"
            
            # Optimization: if current_path already starts with "products/", it's already correct.
            # Normalize to relative path if it was saved as a full URL.
            if current_path and current_path.startswith("products/"):
                if val != current_path:
                    setattr(p, attr, current_path)
                    repaired_any = True
                    old_values[attr] = val
                    new_values[attr] = current_path
                continue
                
            # Check 1: Does it exist at current_path?
            if current_path and check_object_exists(settings.SUPABASE_PRODUCT_BUCKET, current_path):
                if val != current_path:
                    setattr(p, attr, current_path)
                    repaired_any = True
                    old_values[attr] = val
                    new_values[attr] = current_path
                continue
                
            # Check 2: Does it exist at reconstructed_path?
            if check_object_exists(settings.SUPABASE_PRODUCT_BUCKET, reconstructed_path):
                setattr(p, attr, reconstructed_path)
                repaired_any = True
                old_values[attr] = val
                new_values[attr] = reconstructed_path
                
        if p.gallery_images:
            new_gallery = []
            gallery_repaired = False
            for img in p.gallery_images:
                if not img:
                    continue
                if "placeholder-product" in img:
                    continue
                    
                filename, current_path = _extract_filename_and_path(img, settings.SUPABASE_PRODUCT_BUCKET)
                if not filename:
                    new_gallery.append(img)
                    continue
                    
                reconstructed_path = f"products/{category_slug}/{product_slug}/{filename}"
                
                if current_path and current_path.startswith("products/"):
                    new_gallery.append(current_path)
                    if img != current_path:
                        gallery_repaired = True
                    continue
                    
                if current_path and check_object_exists(settings.SUPABASE_PRODUCT_BUCKET, current_path):
                    new_gallery.append(current_path)
                    if img != current_path:
                        gallery_repaired = True
                    continue
                    
                if check_object_exists(settings.SUPABASE_PRODUCT_BUCKET, reconstructed_path):
                    new_gallery.append(reconstructed_path)
                    gallery_repaired = True
                else:
                    new_gallery.append(img)
                    
            if gallery_repaired:
                p.gallery_images = new_gallery
                repaired_any = True
                old_values["gallery_images"] = p.gallery_images
                new_values["gallery_images"] = new_gallery
                
        if repaired_any:
            stats["total_repaired"] += 1
            stats["details"].append({
                "product_id": p.id,
                "title": p.title,
                "old": old_values,
                "new": new_values
            })
            
    if stats["total_repaired"] > 0:
        try:
            db.commit()
            logger.info(f"Successfully repaired paths for {stats['total_repaired']} products.")
        except Exception as exc:
            db.rollback()
            logger.error(f"Failed to commit repaired paths: {exc}")
            
    return stats



