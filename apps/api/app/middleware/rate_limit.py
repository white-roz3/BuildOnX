"""
Rate limiting middleware for IP-based request throttling.
"""

from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
import redis.asyncio as redis

from app.config import settings


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    IP-based rate limiting middleware.
    
    Limits requests per IP address to prevent abuse.
    Different limits for different endpoint types.
    """
    
    # Rate limits: (requests, seconds)
    LIMITS = {
        "default": (60, 60),        # 60 req/min for most endpoints
        "build": (10, 60),          # 10 builds/min
        "auth": (20, 60),           # 20 auth attempts/min
        "health": (1000, 60),       # Basically unlimited for health checks
    }
    
    # Paths to skip rate limiting
    SKIP_PATHS = [
        "/health",
        "/docs",
        "/redoc",
        "/openapi.json",
    ]
    
    def __init__(self, app):
        super().__init__(app)
        self._redis = None
    
    async def _get_redis(self):
        """Lazy initialization of Redis connection."""
        if self._redis is None:
            self._redis = await redis.from_url(settings.redis_url)
        return self._redis
    
    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP from request."""
        # Check X-Forwarded-For header (for proxied requests)
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            # Take the first IP (original client)
            return forwarded.split(",")[0].strip()
        
        # Check X-Real-IP header
        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip.strip()
        
        # Fall back to direct connection IP
        return request.client.host if request.client else "unknown"
    
    def _get_limit_type(self, path: str, method: str) -> str:
        """Determine which rate limit to apply."""
        if path.startswith("/health"):
            return "health"
        if path.startswith("/api/auth"):
            return "auth"
        if path.startswith("/api/projects") and method == "POST":
            return "build"
        return "default"
    
    async def dispatch(self, request: Request, call_next) -> Response:
        """Process request with rate limiting."""
        path = request.url.path
        
        # Skip rate limiting for certain paths
        for skip_path in self.SKIP_PATHS:
            if path.startswith(skip_path):
                return await call_next(request)
        
        # Get client IP
        client_ip = self._get_client_ip(request)
        
        # Determine rate limit
        limit_type = self._get_limit_type(path, request.method)
        max_requests, window_seconds = self.LIMITS[limit_type]
        
        # Check rate limit
        try:
            r = await self._get_redis()
            key = f"ratelimit:{limit_type}:{client_ip}"
            
            # Increment counter
            count = await r.incr(key)
            
            # Set expiry on first request
            if count == 1:
                await r.expire(key, window_seconds)
            
            # Get TTL for headers
            ttl = await r.ttl(key)
            
            # Check if over limit
            if count > max_requests:
                return Response(
                    content='{"error": "Too many requests", "retry_after": ' + str(ttl) + '}',
                    status_code=429,
                    media_type="application/json",
                    headers={
                        "X-RateLimit-Limit": str(max_requests),
                        "X-RateLimit-Remaining": "0",
                        "X-RateLimit-Reset": str(ttl),
                        "Retry-After": str(ttl),
                    },
                )
            
            # Process request
            response = await call_next(request)
            
            # Add rate limit headers to response
            response.headers["X-RateLimit-Limit"] = str(max_requests)
            response.headers["X-RateLimit-Remaining"] = str(max(0, max_requests - count))
            response.headers["X-RateLimit-Reset"] = str(ttl)
            
            return response
            
        except redis.RedisError as e:
            # If Redis is down, allow the request but log
            print(f"Rate limit Redis error: {e}")
            return await call_next(request)


class StrictRateLimitMiddleware(RateLimitMiddleware):
    """
    Stricter rate limiting for production.
    Lower limits and longer bans for repeat offenders.
    """
    
    LIMITS = {
        "default": (30, 60),        # 30 req/min
        "build": (5, 60),           # 5 builds/min
        "auth": (10, 60),           # 10 auth attempts/min
        "health": (100, 60),
    }
    
    async def dispatch(self, request: Request, call_next) -> Response:
        """Add repeat offender tracking."""
        response = await super().dispatch(request, call_next)
        
        # Track repeat 429s for potential banning
        if response.status_code == 429:
            client_ip = self._get_client_ip(request)
            try:
                r = await self._get_redis()
                abuse_key = f"abuse:{client_ip}"
                count = await r.incr(abuse_key)
                await r.expire(abuse_key, 3600)  # 1 hour window
                
                # Log frequent abusers
                if count >= 10:
                    print(f"Frequent rate limit abuse from {client_ip}: {count} violations")
            except Exception:
                pass
        
        return response

