from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.core.config import get_settings
from app.core.logging import configure_logging
from app.middleware.security import RequestSizeLimitMiddleware


@asynccontextmanager
async def lifespan(_app: FastAPI):
    """Initialize logging and application state on startup."""
    configure_logging()
    get_settings()
    yield


def create_app() -> FastAPI:
    """Application factory used by Uvicorn and tests."""
    settings = get_settings()
    app = FastAPI(
        title=settings.app_name,
        version="1.0.0",
        lifespan=lifespan,
    )
    
    # Add security middleware
    app.add_middleware(RequestSizeLimitMiddleware)
    
    # Configure CORS based on environment
    if settings.app_env == "development":
        # Development: allow all origins
        cors_origins = ["*"]
    else:
        # Production: restrict to specific origins
        cors_origins = settings.cors_allowed_origins or ["http://localhost:3000"]
    
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_credentials=False,
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type"],
    )
    
    app.include_router(router)
    return app


app = create_app()
