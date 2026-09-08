from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import auth, bookings

app = FastAPI(
    title="Rooman Bookings API",
    description=(
        "Appointment scheduling and authentication service. Shares its database "
        "and session store with the Next.js application."
    ),
    version=settings.VERSION,
    # Interactive docs expose every endpoint and schema, so they stay off in
    # production unless deliberately enabled.
    docs_url=None if settings.IS_PRODUCTION else "/docs",
    redoc_url=None if settings.IS_PRODUCTION else "/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(bookings.router, prefix="/api")


@app.get("/health", tags=["System"])
@app.get("/api/health", tags=["System"])
async def health_check():
    """Liveness probe. Reports no configuration detail."""
    return {"status": "ok", "service": "rooman-bookings-api", "version": settings.VERSION}


@app.get("/", tags=["System"])
async def root():
    return {"service": "rooman-bookings-api", "health": "/health"}


if __name__ == "__main__":
    import uvicorn

    # Bound to loopback by default; a container sets HOST=0.0.0.0 explicitly.
    import os

    uvicorn.run(
        "main:app",
        host=os.getenv("HOST", "127.0.0.1"),
        port=int(os.getenv("PORT", "8000")),
        reload=not settings.IS_PRODUCTION,
    )
