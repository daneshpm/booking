import os
from typing import List

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    PROJECT_NAME: str = "Rooman Bookings API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"

    ENVIRONMENT: str = os.getenv("NODE_ENV", "development")

    # Database. Shared with the Next.js application, so sessions issued by
    # either service are recognised by both.
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql+asyncpg://postgres:password123@localhost:5434/bookings_dev",
    )

    @property
    def IS_PRODUCTION(self) -> bool:
        return self.ENVIRONMENT.lower() == "production"

    @property
    def ASYNC_DATABASE_URL(self) -> str:
        """Normalise a Prisma-style URL into one asyncpg accepts."""
        url = self.DATABASE_URL
        if url.startswith("postgresql://"):
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        elif url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+asyncpg://", 1)
        # asyncpg rejects libpq query parameters such as ?schema=public.
        if "?" in url:
            url = url.split("?", 1)[0]
        return url

    # Sessions
    SESSION_COOKIE: str = "rb_session"
    SESSION_TTL_DAYS: int = 7

    @property
    def CORS_ORIGINS(self) -> List[str]:
        """
        Browser origins allowed to call this API directly.

        A wildcard is never used: these endpoints are called with credentials,
        and "*" is both rejected by browsers in that mode and unsafe.
        """
        raw = os.getenv("CORS_ORIGINS", "")
        if raw.strip():
            return [origin.strip() for origin in raw.split(",") if origin.strip()]
        if self.IS_PRODUCTION:
            return []
        return ["http://localhost:3000", "http://127.0.0.1:3000"]

    model_config = {
        "case_sensitive": True,
        "env_file": ".env",
        "extra": "ignore",
    }


settings = Settings()

if settings.IS_PRODUCTION and not settings.CORS_ORIGINS:
    # Better to fail at startup than to serve a production API that silently
    # rejects every browser request.
    raise RuntimeError(
        "CORS_ORIGINS must list the allowed browser origins when NODE_ENV=production."
    )
