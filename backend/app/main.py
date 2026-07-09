import logging
import os

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from sqlalchemy.exc import IntegrityError
from app.core.config import settings
from app.api.v1.router import api_router
from fastapi.middleware.gzip import GZipMiddleware
# Domain exception hierarchy — handlers registered below
from app.shared.exceptions import (
    AppException,
    NotFoundError,
    ConflictError,
    ValidationError as DomainValidationError,
    AuthenticationError,
    AuthorizationError,
    BusinessRuleError,
    StorageError,
    IntegrityError as DomainIntegrityError,
    RateLimitError,
    ExternalServiceError,
)

# Import all models so SQLAlchemy registers them
import app.modules  # noqa: F401

logger = logging.getLogger("app")

UPLOADS_ROOT = os.path.abspath(settings.UPLOAD_DIR)
os.makedirs(os.path.join(UPLOADS_ROOT, "products"), exist_ok=True)
os.makedirs(os.path.join(UPLOADS_ROOT, "custom_products"), exist_ok=True)
os.makedirs(os.path.join(UPLOADS_ROOT, "categories"), exist_ok=True)


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

_IS_PRODUCTION = os.getenv("ENVIRONMENT", "development").lower() == "production"


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Programmatic Alembic Upgrade ──
    try:
        import alembic.config
        import alembic.command
        ini_path = "alembic.ini"
        if not os.path.exists(ini_path) and os.path.exists("backend/alembic.ini"):
            ini_path = "backend/alembic.ini"
        alembic_cfg = alembic.config.Config(ini_path)
        alembic.command.upgrade(alembic_cfg, "heads")
        logger.info("Alembic upgrade completed successfully on lifespan startup.")
    except Exception as e:
        logger.error(f"Failed to run alembic upgrade on startup: {e}")

    # ── Bootstrap Normalization Registry ──
    from app.shared.normalization.rules.aliases import default_registry
    from app.core.normalization import AURASTORE_COMPOUND_MAPPINGS, validate_aurastore_aliases

    
    # Run lightweight startup check (validates mappings integrity)
    validate_aurastore_aliases(AURASTORE_COMPOUND_MAPPINGS)
    
    default_registry.initialize_aliases(AURASTORE_COMPOUND_MAPPINGS)

    # ── Fix 8: Fail loudly if Supabase credentials are absent in production ──
    if _IS_PRODUCTION and not (settings.SUPABASE_URL and settings.SUPABASE_SERVICE_ROLE_KEY):
        raise RuntimeError(
            "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in production. "
            "Uploaded images would be written to an ephemeral local directory and "
            "lost on every container restart. Set these env vars and redeploy."
        )

    # ── Fix 9: Verify configured bucket names exist and are reachable ────────
    if settings.SUPABASE_URL and settings.SUPABASE_SERVICE_ROLE_KEY:
        import httpx as _httpx
        _headers = {
            "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
            "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
        }
        for bucket in (settings.SUPABASE_PRODUCT_BUCKET, settings.SUPABASE_CUSTOM_PRODUCT_BUCKET, settings.SUPABASE_BANNER_BUCKET):
            _url = f"{settings.SUPABASE_URL.rstrip('/')}/storage/v1/bucket/{bucket}"
            try:
                resp = _httpx.get(_url, headers=_headers, timeout=10.0)
                if resp.status_code == 404:
                    raise RuntimeError(
                        f"Supabase bucket '{bucket}' does not exist. "
                        f"Create it in your Supabase project or update "
                        f"SUPABASE_PRODUCT_BUCKET / SUPABASE_BANNER_BUCKET in .env."
                    )
                if resp.status_code not in (200, 201):
                    logger.warning(
                        "Could not verify Supabase bucket '%s' (HTTP %s). "
                        "Image uploads may fail at runtime.",
                        bucket, resp.status_code,
                    )
            except _httpx.HTTPError as exc:
                logger.warning("Supabase bucket check failed for '%s': %s", bucket, exc)

    yield


# ──────────────────────────────────────────────────────────────────────────────
# FastAPI app
# ──────────────────────────────────────────────────────────────────────────────

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Admin Dashboard API",
    # Disable Swagger UI and OpenAPI schema in production — they enumerate every
    # endpoint, parameter name, schema, and error shape for free.
    openapi_url=None if _IS_PRODUCTION else f"{settings.API_V1_STR}/openapi.json",
    docs_url=None if _IS_PRODUCTION else "/docs",
    redoc_url=None if _IS_PRODUCTION else "/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    GZipMiddleware,
    minimum_size=1000,
)


# ──────────────────────────────────────────────────────────────────────────────
# CORS
# a REST API and can be exploited (TRACE enables XST attacks).
# ──────────────────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALL_CORS_ORIGINS,
    allow_credentials=True,
    # FIX (SEC-09): was ["*"] — explicitly list only the methods this API uses
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    # Explicitly enumerate needed headers instead of wildcard "*"
    allow_headers=["Authorization", "Content-Type", "Accept", "Origin", "X-Requested-With"],
)


# ──────────────────────────────────────────────────────────────────────────────
# Security response headers
# ──────────────────────────────────────────────────────────────────────────────

@app.middleware("http")
async def security_headers_middleware(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    if _IS_PRODUCTION:
        response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains; preload"
    return response



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
# Domain exception handlers
# Maps app.shared.exceptions → consistent HTTP responses.
# These run before FastAPI's own HTTPException handler.
# Existing `raise HTTPException(...)` calls are unaffected.
# ──────────────────────────────────────────────────────────────────────────────

def _error_body(error: str, code=None, field=None) -> dict:
    """Build a standardized error response body."""
    body: dict = {"success": False, "error": error}
    if code:
        body["code"] = code
    if field:
        body["field"] = field
    return body


@app.exception_handler(NotFoundError)
async def not_found_handler(request: Request, exc: NotFoundError):
    return JSONResponse(status_code=404, content=_error_body(exc.detail, exc.code, exc.field))


@app.exception_handler(ConflictError)
async def conflict_handler(request: Request, exc: ConflictError):
    return JSONResponse(status_code=409, content=_error_body(exc.detail, exc.code, exc.field))


@app.exception_handler(DomainValidationError)
async def domain_validation_handler(request: Request, exc: DomainValidationError):
    return JSONResponse(status_code=422, content=_error_body(exc.detail, exc.code, exc.field))


@app.exception_handler(AuthenticationError)
async def authentication_handler(request: Request, exc: AuthenticationError):
    return JSONResponse(
        status_code=401,
        content=_error_body(exc.detail, exc.code),
        headers={"WWW-Authenticate": "Bearer"},
    )


@app.exception_handler(AuthorizationError)
async def authorization_handler(request: Request, exc: AuthorizationError):
    return JSONResponse(status_code=403, content=_error_body(exc.detail, exc.code))


@app.exception_handler(BusinessRuleError)
async def business_rule_handler(request: Request, exc: BusinessRuleError):
    return JSONResponse(status_code=400, content=_error_body(exc.detail, exc.code, exc.field))


@app.exception_handler(DomainIntegrityError)
async def domain_integrity_handler(request: Request, exc: DomainIntegrityError):
    return JSONResponse(status_code=409, content=_error_body(exc.detail, exc.code))


@app.exception_handler(StorageError)
async def storage_error_handler(request: Request, exc: StorageError):
    logger.error("StorageError on %s %s: %s", request.method, request.url.path, exc)
    return JSONResponse(status_code=503, content=_error_body(exc.detail, exc.code))


@app.exception_handler(RateLimitError)
async def rate_limit_handler(request: Request, exc: RateLimitError):
    return JSONResponse(status_code=429, content=_error_body(exc.detail, exc.code))


@app.exception_handler(ExternalServiceError)
async def external_service_handler(request: Request, exc: ExternalServiceError):
    logger.error("ExternalServiceError on %s %s: %s", request.method, request.url.path, exc)
    return JSONResponse(status_code=502, content=_error_body(exc.detail, exc.code))


@app.exception_handler(AppException)
async def generic_app_exception_handler(request: Request, exc: AppException):
    """Catch-all for any AppException subclass not matched above."""
    logger.error("Unhandled AppException %s on %s %s: %s",
                 type(exc).__name__, request.method, request.url.path, exc)
    return JSONResponse(status_code=500, content=_error_body(exc.detail, exc.code))


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
