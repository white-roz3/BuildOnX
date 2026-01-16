"""
Deployment service for generated projects.
Serves files directly from the API - no external deployment needed.
"""

import base64
from typing import Optional

import httpx

from app.config import settings


class DeployerService:
    """
    Handles deployment of generated projects.
    Files are stored in the database and served directly from the API.
    """
    
    def __init__(self):
        self.base_domain = settings.base_domain
    
    async def deploy(
        self,
        project_id: str,
        slug: str,
        files: dict,
        entry_point: str = "index.html",
    ) -> dict:
        """
        Deploy a project by storing files in the database.
        Files are served directly from the API at /p/{slug} and /p/{slug}/preview
        
        Returns:
            {
                "url": "https://heyclaude.xyz/p/slug",
                "deployment_id": "db-{slug}",
                "status": "running"
            }
        """
        # Files are already saved to DB by the caller
        # We just return the URL
        return {
            "url": f"https://{self.base_domain}/p/{slug}",
            "deployment_id": f"db-{slug}",
            "status": "running",
        }
    
    async def destroy(self, deployment_id: str, slug: str):
        """Destroy a deployment (no-op for DB-stored files)."""
        # Files will be deleted when the project is deleted from DB
        pass
    
    async def get_status(self, slug: str) -> Optional[dict]:
        """Get deployment status."""
        # Projects served from DB are always "running"
        return {
            "deployment_id": f"db-{slug}",
            "status": "running",
            "url": f"https://{self.base_domain}/p/{slug}",
        }

