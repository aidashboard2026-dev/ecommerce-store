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
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24

    # ------------------------------------------------------------------
    # CORS
    # ------------------------------------------------------------------

    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://frontend:5173",
    ]

    # ------------------------------------------------------------------
    # File Uploads
    # ------------------------------------------------------------------

    UPLOAD_DIR: str = "/app/uploads"

    BACKEND_URL: str = ""

    # ------------------------------------------------------------------
    # Optional Future Storage
    # ------------------------------------------------------------------

    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""


settings = Settings()