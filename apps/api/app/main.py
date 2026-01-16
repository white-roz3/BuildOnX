"""
HeyClaude API - Main FastAPI application.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.database import init_db
from app.routers import (
    projects_router,
    builds_router,
    webhooks_router,
    auth_router,
    ws_router,
    admin_router,
)
from app.middleware.rate_limit import RateLimitMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    # Startup
    print("🚀 Starting HeyClaude API...")
    
    # Check API key
    api_key = settings.anthropic_api_key
    if api_key and api_key.strip():
        print(f"✅ Anthropic API key configured ({len(api_key)} chars)")
    else:
        print("❌ WARNING: ANTHROPIC_API_KEY is not configured!")
    
    try:
        await init_db()
        print("✅ Database initialized")
    except Exception as e:
        print(f"⚠️ Database init failed (will retry on first request): {e}")
    
    yield
    
    # Shutdown
    print("👋 Shutting down HeyClaude API...")


app = FastAPI(
    title="HeyClaude API",
    description="Build apps with a tweet. Just @ us.",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Rate limiting middleware (add first so it runs early)
app.add_middleware(RateLimitMiddleware)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://heyclaude.xyz",
        "https://www.heyclaude.xyz",
        "https://heyclaude-web-production.up.railway.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Include routers
app.include_router(projects_router, prefix="/api")
app.include_router(builds_router, prefix="/api")
app.include_router(webhooks_router, prefix="/api")
app.include_router(auth_router, prefix="/api")
app.include_router(admin_router, prefix="/api")
app.include_router(ws_router)  # WebSocket at root level


# ─────────────────────────────────────────────────────────────
# Root Routes
# ─────────────────────────────────────────────────────────────

@app.get("/")
async def root():
    """API root endpoint."""
    return {
        "name": "HeyClaude API",
        "version": "1.0.0",
        "status": "operational",
        "docs": "/docs",
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    import os
    api_key = settings.anthropic_api_key
    env_key = os.environ.get("ANTHROPIC_API_KEY", "")
    return {
        "status": "healthy",
        "api_key_from_settings": len(api_key) if api_key else 0,
        "api_key_from_env": len(env_key) if env_key else 0,
        "api_key_starts_with": api_key[:20] if api_key and len(api_key) > 20 else "empty",
    }


# ─────────────────────────────────────────────────────────────
# Exception Handlers
# ─────────────────────────────────────────────────────────────

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler."""
    if settings.debug:
        # In debug mode, return full error details
        return JSONResponse(
            status_code=500,
            content={
                "error": "Internal Server Error",
                "detail": str(exc),
                "type": type(exc).__name__,
            },
        )
    else:
        # In production, hide details
        return JSONResponse(
            status_code=500,
            content={
                "error": "Internal Server Error",
                "detail": "An unexpected error occurred",
            },
        )


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.debug,
    )

