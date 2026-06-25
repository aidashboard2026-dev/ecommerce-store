import logging
import os

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from sqlalchemy.exc import IntegrityError
from app.core.config import settings
from app.api.router import api_router

# Import all models so SQLAlchemy registers them
import app.modules  # noqa: F401

logger = logging.getLogger("app")

UPLOADS_ROOT = os.path.abspath(settings.UPLOAD_DIR)
os.makedirs(os.path.join(UPLOADS_ROOT, "products"), exist_ok=True)


# ──────────────────────────────────────────────────────────────────────────────
# Request body size limit
# ──────────────────────────────────────────────────────────────────────────────

_MAX_BODY_BYTES = 6 * 1024 * 1024

# Methods that never carry a body — skip all body-inspection entirely.
_BODYLESS_METHODS = frozenset({"GET", "HEAD", "OPTIONS", "DELETE"})


async def _body_size_limit_middleware(request: Request, call_next):

    # ── Bodyless methods: pass through immediately, no body logic. ────────────
    if request.method in _BODYLESS_METHODS:
        return await call_next(request)

    content_type = request.headers.get("content-type", "")

    # Multipart uploads: guarded at the endpoint level; skip middleware.
    if "multipart/form-data" in content_type:
        return await call_next(request)

    content_length = request.headers.get("content-length")

    # Content-Length present — fast-path rejection, no body read needed.
    if content_length is not None:
        if int(content_length) > _MAX_BODY_BYTES:
            return JSONResponse(
                status_code=413,
                content={
                    "detail": (
                        f"Request body exceeds the "
                        f"{_MAX_BODY_BYTES // (1024 * 1024)} MB limit. "
                        "Please reduce the payload size and try again."
                    )
                },
            )
        return await call_next(request)

    # No Content-Length (chunked transfer encoding) — stream with limit.
    body_chunks: list[bytes] = []
    total_bytes = 0

    async for chunk in request.stream():
        total_bytes += len(chunk)
        if total_bytes > _MAX_BODY_BYTES:
            return JSONResponse(
                status_code=413,
                content={
                    "detail": (
                        f"Request body exceeds the "
                        f"{_MAX_BODY_BYTES // (1024 * 1024)} MB limit. "
                        "Upload aborted after "
                        f"{total_bytes / (1024 * 1024):.1f} MB."
                    )
                },
            )
        body_chunks.append(chunk)

    body = b"".join(body_chunks)

    _body_sent = False

    async def _replay_receive() -> dict:
        nonlocal _body_sent
        if not _body_sent:
            _body_sent = True
            return {"type": "http.request", "body": body, "more_body": False}
        return {"type": "http.disconnect"}

    request._receive = _replay_receive  # type: ignore[attr-defined]

    return await call_next(request)


# ──────────────────────────────────────────────────────────────────────────────
# Application lifespan — RUNTIME ONLY
# ──────────────────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


# ──────────────────────────────────────────────────────────────────────────────
# FastAPI app
# ──────────────────────────────────────────────────────────────────────────────

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Admin Dashboard API",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan,
)


# ──────────────────────────────────────────────────────────────────────────────
# CORS
# a REST API and can be exploited (TRACE enables XST attacks).
# ──────────────────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    # FIX (SEC-09): was ["*"] — explicitly list only the methods this API uses
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


# ──────────────────────────────────────────────────────────────────────────────
# Request body limit middleware
# ──────────────────────────────────────────────────────────────────────────────

@app.middleware("http")
async def body_size_limit_middleware(request: Request, call_next):
    return await _body_size_limit_middleware(request, call_next)


# ──────────────────────────────────────────────────────────────────────────────
# Static uploads
# Mounts /uploads → UPLOADS_ROOT (the named Docker volume /app/uploads).
# This makes ALL upload sub-directories (products/, offers/, …) accessible.
# ──────────────────────────────────────────────────────────────────────────────

os.makedirs(UPLOADS_ROOT, exist_ok=True)

app.mount(
    "/uploads",
    StaticFiles(directory=UPLOADS_ROOT),
    name="uploads",
)


# ──────────────────────────────────────────────────────────────────────────────
# Global exception handlers
# ──────────────────────────────────────────────────────────────────────────────

@app.exception_handler(IntegrityError)
async def integrity_error_handler(request: Request, exc: IntegrityError):
    """
    Catches DB constraint violations that escape application-level checks —
    e.g. a stock-quantity race that slips past with_for_update() locking,
    or a duplicate-key race on concurrent inserts. Without this handler,
    these surface as raw 500s with a leaked SQL error message.
    """
    logger.error("IntegrityError on %s %s: %s", request.method, request.url.path, exc)
    return JSONResponse(
        status_code=409,
        content={
            "detail": (
                "This action conflicts with the current state of the data "
                "(e.g. insufficient stock or a duplicate entry). Please refresh and try again."
            )
        },
    )


# ──────────────────────────────────────────────────────────────────────────────
# API Routes
# ──────────────────────────────────────────────────────────────────────────────

app.include_router(
    api_router,
    prefix=settings.API_V1_STR,
)


# ──────────────────────────────────────────────────────────────────────────────
# Health Check
# ──────────────────────────────────────────────────────────────────────────────

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "version": settings.VERSION,
    }
