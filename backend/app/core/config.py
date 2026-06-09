from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


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

    INITIAL_ADMIN_NAME: str = "Admin"
    INITIAL_ADMIN_EMAIL: str = "admin@mail.com"
    INITIAL_ADMIN_PASSWORD: str = "admin1234"

    SECRET_KEY: str = "super-secret-key-change-in-production-please"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24

    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://frontend:5173",
    ]

    # Upload directory — must match the Docker volume mount point.
    # In the container: named volume `product_uploads` is mounted at /app/uploads.
    # Setting this explicitly avoids the fragile __file__-relative fallback logic.
    UPLOAD_DIR: str = "/app/uploads"

    # Public-facing backend URL used to construct absolute image URLs.
    # Override in .env for staging/production (e.g. https://api.mystore.com).
    # In local Docker dev the frontend Vite proxy rewrites /uploads → backend:8000,
    # so an empty string (relative URL) works for dev. Set explicitly for prod.
    BACKEND_URL: str = ""


settings = Settings()