"""
API Routers for BuildOnX.
"""

from app.routers.projects import router as projects_router
from app.routers.builds import router as builds_router
from app.routers.webhooks import router as webhooks_router
from app.routers.auth import router as auth_router
from app.routers.ws import router as ws_router
from app.routers.admin import router as admin_router

__all__ = [
    "projects_router",
    "builds_router",
    "webhooks_router",
    "auth_router",
    "ws_router",
    "admin_router",
]

