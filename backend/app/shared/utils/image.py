import os
from typing import Optional

from fastapi import HTTPException, UploadFile, status

from app.core.constants import MAX_IMAGE_SIZE, ALLOWED_IMAGE_EXTENSIONS

# ── Allowlists ────────────────────────────────────────────────────────────────

ALLOWED_IMAGE_MIMES: frozenset = frozenset({
    "image/jpeg",
    "image/png",
    "image/webp",
})

ALLOWED_IMAGE_EXTS: frozenset = frozenset(
    f".{ext.lstrip('.')}" for ext in ALLOWED_IMAGE_EXTENSIONS
)

MAX_IMAGE_BYTES: int = MAX_IMAGE_SIZE

# ── Magic byte signatures ─────────────────────────────────────────────────────

_MAGIC_BYTES: dict = {
    b"\xff\xd8\xff": "image/jpeg",
    b"\x89PNG":      "image/png",
    b"RIFF":         "image/webp",
}


# ── Core validator ────────────────────────────────────────────────────────────

def validate_and_read_image(
    file: UploadFile,
    *,
    max_bytes: int = MAX_IMAGE_BYTES,
    allowed_mimes: Optional[frozenset] = None,
    allowed_extensions: Optional[frozenset] = None,
) -> bytes:
    """
    Validate a FastAPI UploadFile and return its raw bytes.

    Checks performed (in order):
      1. MIME type against allowlist
      2. File extension against allowlist
      3. File size against max_bytes cap
      4. Magic-byte signature against known image formats
      5. RIFF/WebP sub-signature for WebP files

    Args:
        file:               The UploadFile from the request.
        max_bytes:          Maximum allowed file size. Default: 5 MB.
        allowed_mimes:      Override the default MIME type allowlist.
        allowed_extensions: Override the default extension allowlist.

    Returns:
        Raw bytes of the file contents.

    Raises:
        HTTPException(422): MIME mismatch, extension mismatch, empty file,
                            or unrecognised image format.
        HTTPException(413): File exceeds max_bytes.
    """
    mimes = allowed_mimes      or ALLOWED_IMAGE_MIMES
    exts  = allowed_extensions or ALLOWED_IMAGE_EXTS

    # ── 1. MIME type ──────────────────────────────────────────────────────────
    if file.content_type not in mimes:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            f"Only JPG, PNG, and WebP are allowed. Got: {file.content_type}",
        )

    # ── 2. Extension ──────────────────────────────────────────────────────────
    ext = os.path.splitext(file.filename or "image.jpg")[1].lower()
    if ext not in exts:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            f"Extension '{ext}' not allowed. Use: {', '.join(sorted(exts))}",
        )

    # ── 3. Size (streaming read) ──────────────────────────────────────────────
    _CHUNK = 65_536
    chunks: list = []
    total  = 0
    while True:
        chunk = file.file.read(_CHUNK)
        if not chunk:
            break
        total += len(chunk)
        if total > max_bytes:
            raise HTTPException(
                status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                f"Image must be under {max_bytes // (1024 * 1024)} MB.",
            )
        chunks.append(chunk)

    contents = b"".join(chunks)

    if not contents:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "Uploaded file is empty.",
        )

    # ── 4 + 5. Magic bytes ────────────────────────────────────────────────────
    header = contents[:16]
    if len(header) < 4:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "File is too small to be a valid image.",
        )

    detected = None
    for magic, mime in _MAGIC_BYTES.items():
        if header[: len(magic)] == magic:
            detected = mime
            break

    if not detected:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "File content does not match any supported image format (JPEG, PNG, WebP).",
        )

    if detected == "image/webp" and header[8:12] != b"WEBP":
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "File has RIFF header but is not a valid WebP image.",
        )

    return contents
