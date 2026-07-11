from typing import List

from pydantic import computed_field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        case_sensitive=True,
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ------------------------------------------------------------------
    # Application
    # ------------------------------------------------------------------

    PROJECT_NAME: str = "AdminDash Pro"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"

    # ------------------------------------------------------------------
    # Database (Supabase PostgreSQL)
    # ------------------------------------------------------------------

    POSTGRES_SERVER: str
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_DB: str
    POSTGRES_PORT: int = 5432

    @field_validator(
        "POSTGRES_SERVER",
        "POSTGRES_USER",
        "POSTGRES_PASSWORD",
        "POSTGRES_DB",
        mode="after",
    )
    @classmethod
    def database_fields_required(cls, v: str) -> str:
        if not v or not str(v).strip():
            raise ValueError("Database configuration is missing.")
        return v

    @computed_field
    @property
    def DATABASE_URL(self) -> str:
        return (
            f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}"
            f"/{self.POSTGRES_DB}"
        )

    # ------------------------------------------------------------------
    # Initial Admin
    # ------------------------------------------------------------------

    INITIAL_ADMIN_NAME: str = "Admin"
    INITIAL_ADMIN_EMAIL: str = "admin@mail.com"
    INITIAL_ADMIN_PASSWORD: str = ""

    @field_validator("INITIAL_ADMIN_PASSWORD", mode="after")
    @classmethod
    def initial_admin_password_must_be_set(cls, v: str) -> str:
        return v

    # ------------------------------------------------------------------
    # JWT / Security
    # ------------------------------------------------------------------

    SECRET_KEY: str = ""

    @field_validator("SECRET_KEY", mode="after")
    @classmethod
    def secret_key_must_be_strong(cls, v: str) -> str:
        if not v:
            raise ValueError(
                "SECRET_KEY must be set in the environment. "
                "Generate one using: "
                "python -c \"import secrets; print(secrets.token_hex(32))\""
            )

        if len(v) < 32:
            raise ValueError(
                "SECRET_KEY must be at least 32 characters long."
            )

        if (
            "super-secret-key" in v.lower()
            or "change-in-production" in v.lower()
        ):
            raise ValueError(
                "SECRET_KEY appears to be a placeholder value."
            )

        return v

    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 8        # 8 h — customer sessions
    ADMIN_TOKEN_EXPIRE_MINUTES: int = 60              # 1 h — admin sessions (shorter by design)

    # ------------------------------------------------------------------
    # CORS
    # Set BACKEND_CORS_ORIGINS as a comma-separated string in .env:
    #   BACKEND_CORS_ORIGINS=http://localhost:5173,https://yourdomain.com
    # ------------------------------------------------------------------

    BACKEND_CORS_ORIGINS: List[str] = []

    PRODUCTION_FRONTEND_URL: str = ""

    # ------------------------------------------------------------------
    # Email (password reset, transactional)
    # Set RESEND_API_KEY for Resend (recommended), or configure SMTP.
    # ------------------------------------------------------------------

    # Resend (https://resend.com) — simplest integration with FastAPI
    RESEND_API_KEY: str = ""

    # SMTP fallback (leave blank if using Resend)
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = "noreply@yourdomain.com"
    SMTP_FROM_NAME: str = "My Designers"
    SMTP_TLS: bool = True

    # Optional Google reCAPTCHA support for public forms.
    RECAPTCHA_SECRET_KEY: str = ""
    RECAPTCHA_MIN_SCORE: float = 0.5

    # URL of the frontend — used to build password-reset links in emails.
    # For local dev: http://localhost:5173
    # For production: https://yourdomain.com
    FRONTEND_URL: str = "http://localhost:5173"

    # How long (minutes) a password-reset token stays valid
    PASSWORD_RESET_TOKEN_EXPIRE_MINUTES: int = 60

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    @computed_field
    @property
    def ALL_CORS_ORIGINS(self) -> List[str]:
        """Merges BACKEND_CORS_ORIGINS with PRODUCTION_FRONTEND_URL if set."""
        origins = list(self.BACKEND_CORS_ORIGINS)
        if self.PRODUCTION_FRONTEND_URL and self.PRODUCTION_FRONTEND_URL not in origins:
            origins.append(self.PRODUCTION_FRONTEND_URL)
        return origins

    # ------------------------------------------------------------------
    # File Uploads
    # ------------------------------------------------------------------

    UPLOAD_DIR: str = "/app/uploads"

    BACKEND_URL: str = ""

    # ------------------------------------------------------------------
    # Supabase Storage
    # ------------------------------------------------------------------
    # All product, custom product, and banner images live in Supabase Storage
    # buckets. Each domain has its own bucket to enforce storage isolation.
    # SUPABASE_SERVICE_ROLE_KEY is used server-side only (never exposed to the
    # frontend) so the backend can upload/delete objects regardless of bucket
    # RLS policies. SUPABASE_ANON_KEY is kept for any future client-side use.

    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    SUPABASE_PRODUCT_BUCKET: str = "product-images"
    SUPABASE_CUSTOM_PRODUCT_BUCKET: str = "custom-product-images"
    SUPABASE_BANNER_BUCKET: str = "banners"
    SUPABASE_CATEGORY_BUCKET: str = "category-images"

    RAZORPAY_KEY_ID: str = ""
    RAZORPAY_KEY_SECRET: str = ""

    @field_validator("SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", mode="after")
    @classmethod
    def supabase_storage_credentials_optional(cls, v: str) -> str:
        # We allow empty strings at startup to facilitate a local upload directory fallback
        # when Supabase Storage is not configured (e.g. in local development).
        return v or ""

    # ------------------------------------------------------------------
    # Razorpay Integration
    # ------------------------------------------------------------------
    RAZORPAY_KEY_ID: str = ""
    RAZORPAY_KEY_SECRET: str = ""
    RAZORPAY_WEBHOOK_SECRET: str = ""

    @field_validator("RAZORPAY_KEY_ID", mode="after")
    @classmethod
    def razorpay_key_id_required(cls, v: str) -> str:
        # Allow empty value during development
        if not v or not str(v).strip():
            return ""

        if any(p in v.lower() for p in ["placeholder", "change-me", "changeme", "your_key"]):
            raise ValueError("RAZORPAY_KEY_ID appears to be a placeholder value.")

        if not (v.startswith("rzp_test_") or v.startswith("rzp_live_")):
            raise ValueError("RAZORPAY_KEY_ID must start with 'rzp_test_' or 'rzp_live_'.")

        return v

    @field_validator("RAZORPAY_KEY_SECRET", mode="after")
    @classmethod
    def razorpay_key_secret_required(cls, v: str) -> str:
        # Allow empty value during development
        if not v or not str(v).strip():
            return ""

        if any(
            p in v.lower()
            for p in ["placeholder", "change-me", "changeme", "your_secret"]
        ):
            raise ValueError(
                "RAZORPAY_KEY_SECRET appears to be a placeholder value."
            )

        return v


settings = Settings()