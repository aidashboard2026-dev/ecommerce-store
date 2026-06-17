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

import httpx
from fastapi import HTTPException, status

from app.core.config import settings

_STORAGE_BASE = f"{settings.SUPABASE_URL.rstrip('/')}/storage/v1"
_TIMEOUT = httpx.Timeout(30.0, connect=10.0)


# ─────────────────────────────────────────────────────────────
# Internal helpers
# ─────────────────────────────────────────────────────────────

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

def upload_product_image(
    contents: bytes,
    original_filename: str,
    content_type: str,
    product_id: int,
) -> str:
    """Uploads a product image and returns its public Supabase URL."""
    object_path = _generate_unique_filename(original_filename, prefix=f"{product_id}_")
    return _upload_object(settings.SUPABASE_PRODUCT_BUCKET, object_path, contents, content_type)


def delete_product_image(image_url: Optional[str]) -> None:
    """Deletes a product image from Supabase given its stored public URL."""
    object_path = _object_path_from_public_url(image_url, settings.SUPABASE_PRODUCT_BUCKET)
    if object_path:
        _delete_object(settings.SUPABASE_PRODUCT_BUCKET, object_path)


# ─────────────────────────────────────────────────────────────
# Public API — banner images
# ─────────────────────────────────────────────────────────────

def upload_banner_image(
    contents: bytes,
    original_filename: str,
    content_type: str,
) -> str:
    """Uploads a banner image and returns its public Supabase URL."""
    object_path = _generate_unique_filename(original_filename)
    return _upload_object(settings.SUPABASE_BANNER_BUCKET, object_path, contents, content_type)


def delete_banner_image(image_url: Optional[str]) -> None:
    """Deletes a banner image from Supabase given its stored public URL."""
    object_path = _object_path_from_public_url(image_url, settings.SUPABASE_BANNER_BUCKET)
    if object_path:
        _delete_object(settings.SUPABASE_BANNER_BUCKET, object_path)
