import os
from typing import List

from pydantic import field_validator
from pydantic_settings import BaseSettings

# The local dev Postgres credential, also used as the built-in fallback when
# DATABASE_URL is unset. Compared against below so a production deployment
# that forgot to set it fails loudly instead of silently running against a
# well-known password.
DEFAULT_DATABASE_URL = "postgresql+asyncpg://postgres:password123@localhost:5434/bookings_dev"


class Settings(BaseSettings):
    PROJECT_NAME: str = "Rooman Bookings API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"

    ENVIRONMENT: str = os.getenv("NODE_ENV", "development")

    # Database. Shared with the Next.js application, so sessions issued by
    # either service are recognised by both.
    #
    # An empty variable falls back to the local default rather than reaching
    # SQLAlchemy as "", which fails at import with an unhelpful parse error.
    DATABASE_URL: str = DEFAULT_DATABASE_URL

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def _default_when_blank(cls, value: object) -> object:
        # pydantic-settings prefers an environment variable even when it is an
        # empty string, which would otherwise reach SQLAlchemy as "" and fail at
        # import with an unhelpful parse error.
        if value is None or (isinstance(value, str) and not value.strip()):
            return DEFAULT_DATABASE_URL
        return value

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

    # Rate limiting. Shared with the Next.js app so a limit holds across both
    # services; unset in a single-instance deployment falls back to a
    # per-process counter (see app/rate_limit.py).
    REDIS_URL: str = ""

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

if settings.IS_PRODUCTION and settings.DATABASE_URL == DEFAULT_DATABASE_URL:
    # Better to fail at startup than to serve production traffic against a
    # database reachable with a well-known, publicly documented password.
    raise RuntimeError(
        "DATABASE_URL must be set explicitly when NODE_ENV=production; "
        "the default local-dev value is not a valid production database."
    )
