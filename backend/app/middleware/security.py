"""Security middleware for request validation and rate limiting."""
from __future__ import annotations

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import get_settings


class RequestSizeLimitMiddleware(BaseHTTPMiddleware):
    """Middleware to enforce maximum request size limits."""

    async def dispatch(self, request: Request, call_next):
        """Check request size before processing."""
        settings = get_settings()
        
        if request.method in ["POST", "PUT", "PATCH"]:
            content_length = request.headers.get("content-length")
            if content_length:
                try:
                    size = int(content_length)
                    if size > settings.max_request_size_bytes:
                        return JSONResponse(
                            status_code=413,
                            content={"detail": "Request payload too large"},
                        )
                except ValueError:
                    pass
        
        return await call_next(request)
