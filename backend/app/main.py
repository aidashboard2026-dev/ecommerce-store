import os

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from app.core.config import settings
from app.api.v1.router import api_router

# Import all models so SQLAlchemy registers them
import app.models  # noqa: F401


# UPLOADS_ROOT points to the named volume mount: /app/uploads inside the container.
# settings.UPLOAD_DIR defaults to /app/uploads (see config.py) which matches
# the Docker Compose volume: product_uploads:/app/uploads
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
    # The callable MUST be stateful: Starlette's StreamingResponse runs a
    # concurrent listen_for_disconnect() task that calls receive() again
    # after the body is consumed. Returning http.request a second time
    # raises RuntimeError: Unexpected message received: http.request.
    # Returning http.disconnect matches what a real ASGI server does once
    # the request body is fully consumed.
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
        # Subsequent calls (e.g. listen_for_disconnect) get disconnect.
        return {"type": "http.disconnect"}

    request._receive = _replay_receive  # type: ignore[attr-defined]

    return await call_next(request)


# ──────────────────────────────────────────────────────────────────────────────
# Application lifespan — RUNTIME ONLY
#
# IMPORTANT: No DB mutations here. Schema, ENUMs, and seeding are owned
# entirely by entrypoint.sh → alembic upgrade head → init_db().
# Running init_db() here would cause duplicate execution across all 4
# Uvicorn workers, leading to race conditions and duplicate inserts.
# ──────────────────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Nothing to do at startup — migrations and seeding run before uvicorn starts.
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
# ──────────────────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
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
#
# Browser URL:  http://localhost:8000/uploads/products/<filename>
# DB storage:   /uploads/products/<filename>  (relative, no host)
# Frontend:     Vite proxy rewrites /uploads → http://backend:8000
#               In production, point BACKEND_URL to the actual API host.
# ──────────────────────────────────────────────────────────────────────────────

os.makedirs(UPLOADS_ROOT, exist_ok=True)

app.mount(
    "/uploads",
    StaticFiles(directory=UPLOADS_ROOT),
    name="uploads",
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