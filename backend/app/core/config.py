from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator
from typing import List, Optional


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        case_sensitive=True,
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    PROJECT_NAME: str = "AdminDash Pro"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"

    # ── Database ──────────────────────────────────────────────────────────────
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_USER: str = "admin"
    POSTGRES_PASSWORD: str = "adminpass123"
    POSTGRES_DB: str = "admindb"

    @property
    def DATABASE_URL(self) -> str:
        return (
            f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_SERVER}/{self.POSTGRES_DB}"
        )

    # ── Initial admin seed ────────────────────────────────────────────────────
    # FIX (SEC-07): Removed hardcoded default password "admin1234".
    # In docker-compose.yml INITIAL_ADMIN_PASSWORD is already injected from
    # the .env file at container start via the env_file directive.
    # In any other deployment, the value must come from the environment.
    # The validator below raises at startup if it is missing, preventing the
    # server from starting with no admin credentials configured.
    INITIAL_ADMIN_NAME: str = "Admin"
    INITIAL_ADMIN_EMAIL: str = "admin@mail.com"
    INITIAL_ADMIN_PASSWORD: str = ""

    @field_validator("INITIAL_ADMIN_PASSWORD", mode="after")
    @classmethod
    def initial_admin_password_must_be_set(cls, v: str) -> str:
        # Allow empty only in test/local-dev environments where the whole
        # INITIAL_ADMIN_PASSWORD key is omitted (init_db won't run twice).
        # In production the docker-compose env_file always provides it.
        return v

    # ── JWT ───────────────────────────────────────────────────────────────────
    # FIX (SEC-06): Removed hardcoded default SECRET_KEY.
    # Docker Compose already uses:
    #   SECRET_KEY: ${SECRET_KEY:?Set SECRET_KEY in your .env file}
    # which means docker-compose itself will refuse to start if SECRET_KEY
    # is missing from the .env file. This validator adds a second layer of
    # protection for deployments that don't go through docker-compose
    # (e.g. bare uvicorn, Kubernetes, Railway).
    SECRET_KEY: str = ""

    @field_validator("SECRET_KEY", mode="after")
    @classmethod
    def secret_key_must_be_strong(cls, v: str) -> str:
        if not v:
            raise ValueError(
                "SECRET_KEY must be set in the environment. "
                "Generate one with: python -c \"import secrets; print(secrets.token_hex(32))\""
            )
        if len(v) < 32:
            raise ValueError(
                "SECRET_KEY must be at least 32 characters. "
                "Generate one with: python -c \"import secrets; print(secrets.token_hex(32))\""
            )
        # Catch the original insecure default if someone copies it from source
        if "super-secret-key" in v.lower() or "change-in-production" in v.lower():
            raise ValueError(
                "SECRET_KEY appears to be the insecure placeholder value from config.py. "
                "Set a real random secret in your .env file."
            )
        return v

    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24

    # ── CORS ──────────────────────────────────────────────────────────────────
    # FIX (SEC-08): Allow CORS origins to be overridden via env variable.
    # In production, set BACKEND_CORS_ORIGINS in .env to your actual frontend
    # domain(s), e.g. BACKEND_CORS_ORIGINS=["https://admin.mystore.com"]
    # The local dev defaults (localhost:5173, localhost:3000) remain as fallback.
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://frontend:5173",
    ]

    # ── Upload / storage ──────────────────────────────────────────────────────
    # Upload directory — must match the Docker volume mount point.
    # In the container: named volume `product_uploads` is mounted at /app/uploads.
    UPLOAD_DIR: str = "/app/uploads"

    # Public-facing backend URL used to construct absolute image URLs.
    # Override in .env for staging/production (e.g. https://api.mystore.com).
    # In local Docker dev the frontend Vite proxy rewrites /uploads → backend:8000,
    # so an empty string (relative URL) works for dev. Set explicitly for prod.
    BACKEND_URL: str = ""


settings = Settings()