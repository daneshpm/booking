from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import auth, bookings

app = FastAPI(
    title="Rooman Bookings API",
    description="Multi-tenant appointment scheduling and authentication backend for Rooman Technologies",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS Middleware Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers under /api
app.include_router(auth.router, prefix="/api")
app.include_router(bookings.router, prefix="/api")

@app.get("/health", tags=["System"])
@app.get("/api/health", tags=["System"])
async def health_check():
    """Service health and liveness probe."""
    return {
        "status": "ok",
        "service": "rooman-bookings-api",
        "version": "1.0.0",
        "platform": "Rooman Technologies",
    }

@app.get("/", tags=["System"])
async def root():
    return {
        "message": "Welcome to Rooman Bookings API",
        "documentation": "/docs",
        "health": "/health",
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
