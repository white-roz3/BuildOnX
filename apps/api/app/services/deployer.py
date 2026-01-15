"""
Deployment service for generated projects.
Uses Fly.io Machines API for container-based deployments.
"""

import base64
from typing import Optional

import httpx

from app.config import settings


class DeployerService:
    """
    Handles deployment of generated projects.
    Uses Fly.io Machines API for container-based deployments.
    """
    
    def __init__(self):
        self.fly_api_token = settings.fly_api_token
        self.fly_org = settings.fly_org
        self.base_domain = settings.base_domain
        self.api_base = "https://api.machines.dev/v1"
    
    @property
    def headers(self) -> dict:
        return {
            "Authorization": f"Bearer {self.fly_api_token}",
            "Content-Type": "application/json",
        }
    
    async def deploy(
        self,
        project_id: str,
        slug: str,
        files: dict,
        entry_point: str = "index.html",
    ) -> dict:
        """
        Deploy a project to Fly.io.
        
        For static sites: Deploy to a simple nginx container
        For dynamic apps: Deploy appropriate runtime
        
        Returns:
            {
                "url": "https://slug.heyclaude.app",
                "deployment_id": "machine_id",
                "status": "running"
            }
        """
        # Determine deployment strategy
        if self._is_static_site(files):
            return await self._deploy_static(project_id, slug, files, entry_point)
        elif self._is_python_app(files):
            return await self._deploy_python(project_id, slug, files)
        else:
            return await self._deploy_static(project_id, slug, files, entry_point)
    
    async def _deploy_static(
        self,
        project_id: str,
        slug: str,
        files: dict,
        entry_point: str,
    ) -> dict:
        """Deploy a static site using nginx."""
        app_name = f"bx-{slug}"[:24]  # Fly app names max 24 chars
        
        # Create Fly app if it doesn't exist
        await self._ensure_app_exists(app_name)
        
        # Allocate an IP address
        await self._allocate_ip(app_name)
        
        # Build nginx config
        nginx_conf = self._generate_nginx_config(entry_point)
        
        # Prepare files for machine
        machine_files = self._prepare_files_for_machine(files, nginx_conf)
        
        # Create machine config
        machine_config = {
            "config": {
                "image": "nginx:alpine",
                "env": {
                    "PROJECT_ID": project_id,
                },
                "services": [
                    {
                        "ports": [
                            {"port": 443, "handlers": ["tls", "http"]},
                            {"port": 80, "handlers": ["http"]},
                        ],
                        "protocol": "tcp",
                        "internal_port": 8080,
                    }
                ],
                "files": machine_files,
                "guest": {
                    "cpu_kind": "shared",
                    "cpus": 1,
                    "memory_mb": 256,
                },
            },
        }
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            # Check for existing machines and delete them
            existing = await client.get(
                f"{self.api_base}/apps/{app_name}/machines",
                headers=self.headers,
            )
            
            if existing.status_code == 200:
                machines = existing.json()
                for machine in machines:
                    await client.delete(
                        f"{self.api_base}/apps/{app_name}/machines/{machine['id']}",
                        headers=self.headers,
                        params={"force": "true"},
                    )
            
            # Create new machine
            response = await client.post(
                f"{self.api_base}/apps/{app_name}/machines",
                headers=self.headers,
                json=machine_config,
            )
            
            if response.status_code not in [200, 201]:
                raise Exception(f"Deployment failed: {response.text}")
            
            machine = response.json()
            
            return {
                "url": f"https://{app_name}.fly.dev",
                "deployment_id": machine["id"],
                "status": "running",
            }
    
    async def _deploy_python(
        self,
        project_id: str,
        slug: str,
        files: dict,
    ) -> dict:
        """Deploy a Python/FastAPI application."""
        app_name = f"bx-{slug}"[:24]
        
        await self._ensure_app_exists(app_name)
        await self._allocate_ip(app_name)
        
        # Add startup script
        startup_script = """#!/bin/sh
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8080
"""
        
        machine_files = []
        
        # Add project files
        for filename, content in files.items():
            machine_files.append({
                "guest_path": f"/app/{filename}",
                "raw_value": base64.b64encode(content.encode()).decode(),
            })
        
        # Add startup script
        machine_files.append({
            "guest_path": "/app/start.sh",
            "raw_value": base64.b64encode(startup_script.encode()).decode(),
        })
        
        machine_config = {
            "config": {
                "image": "python:3.11-slim",
                "env": {
                    "PROJECT_ID": project_id,
                },
                "services": [
                    {
                        "ports": [
                            {"port": 443, "handlers": ["tls", "http"]},
                            {"port": 80, "handlers": ["http"]},
                        ],
                        "protocol": "tcp",
                        "internal_port": 8080,
                    }
                ],
                "files": machine_files,
                "guest": {
                    "cpu_kind": "shared",
                    "cpus": 1,
                    "memory_mb": 512,
                },
                "processes": [
                    {
                        "name": "app",
                        "entrypoint": ["/bin/sh", "/app/start.sh"],
                    }
                ],
            },
        }
        
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{self.api_base}/apps/{app_name}/machines",
                headers=self.headers,
                json=machine_config,
            )
            
            if response.status_code not in [200, 201]:
                raise Exception(f"Deployment failed: {response.text}")
            
            machine = response.json()
            
            return {
                "url": f"https://{app_name}.fly.dev",
                "deployment_id": machine["id"],
                "status": "running",
            }
    
    async def _ensure_app_exists(self, app_name: str):
        """Create Fly app if it doesn't exist."""
        async with httpx.AsyncClient() as client:
            # Check if app exists
            response = await client.get(
                f"{self.api_base}/apps/{app_name}",
                headers=self.headers,
            )
            
            if response.status_code == 404:
                # Create app
                response = await client.post(
                    f"{self.api_base}/apps",
                    headers=self.headers,
                    json={
                        "app_name": app_name,
                        "org_slug": self.fly_org,
                    },
                )
                
                if response.status_code not in [200, 201]:
                    # App might already exist, that's ok
                    pass
    
    async def _allocate_ip(self, app_name: str):
        """Allocate IP addresses for the app."""
        async with httpx.AsyncClient() as client:
            # Allocate shared IPv4
            await client.post(
                f"https://api.fly.io/graphql",
                headers=self.headers,
                json={
                    "query": """
                        mutation($appId: ID!) {
                            allocateIpAddress(input: {appId: $appId, type: shared_v4}) {
                                ipAddress { address }
                            }
                        }
                    """,
                    "variables": {"appId": app_name},
                },
            )
            
            # Allocate IPv6
            await client.post(
                f"https://api.fly.io/graphql",
                headers=self.headers,
                json={
                    "query": """
                        mutation($appId: ID!) {
                            allocateIpAddress(input: {appId: $appId, type: v6}) {
                                ipAddress { address }
                            }
                        }
                    """,
                    "variables": {"appId": app_name},
                },
            )
    
    def _prepare_files_for_machine(self, files: dict, nginx_conf: str) -> list:
        """Prepare files in Fly Machine format."""
        machine_files = []
        
        # Add nginx config
        machine_files.append({
            "guest_path": "/etc/nginx/nginx.conf",
            "raw_value": base64.b64encode(nginx_conf.encode()).decode(),
        })
        
        # Add project files
        for filename, content in files.items():
            # Ensure content is string
            if isinstance(content, bytes):
                content = content.decode("utf-8")
            elif not isinstance(content, str):
                content = str(content)
            
            machine_files.append({
                "guest_path": f"/usr/share/nginx/html/{filename}",
                "raw_value": base64.b64encode(content.encode()).decode(),
            })
        
        return machine_files
    
    def _generate_nginx_config(self, entry_point: str) -> str:
        """Generate nginx config for static site."""
        return f"""worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /tmp/nginx.pid;

events {{
    worker_connections 1024;
}}

http {{
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    # Temp paths for non-root
    client_body_temp_path /tmp/client_temp;
    proxy_temp_path /tmp/proxy_temp;
    fastcgi_temp_path /tmp/fastcgi_temp;
    uwsgi_temp_path /tmp/uwsgi_temp;
    scgi_temp_path /tmp/scgi_temp;
    
    server {{
        listen 8080;
        server_name _;
        root /usr/share/nginx/html;
        index {entry_point};
        
        location / {{
            try_files $uri $uri/ /{entry_point};
        }}
        
        # Enable gzip
        gzip on;
        gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
        
        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        
        # Cache static assets
        location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {{
            expires 7d;
            add_header Cache-Control "public, immutable";
        }}
    }}
}}"""
    
    def _is_static_site(self, files: dict) -> bool:
        """Check if project is a static site."""
        static_extensions = {".html", ".css", ".js", ".json", ".svg", ".png", ".jpg", ".ico"}
        return all(
            any(f.endswith(ext) for ext in static_extensions)
            for f in files.keys()
        )
    
    def _is_python_app(self, files: dict) -> bool:
        """Check if project is a Python app."""
        return "requirements.txt" in files or any(f.endswith(".py") for f in files)
    
    async def destroy(self, deployment_id: str, slug: str):
        """Destroy a deployment."""
        app_name = f"bx-{slug}"[:24]
        
        async with httpx.AsyncClient() as client:
            await client.delete(
                f"{self.api_base}/apps/{app_name}/machines/{deployment_id}",
                headers=self.headers,
                params={"force": "true"},
            )
    
    async def get_status(self, slug: str) -> Optional[dict]:
        """Get deployment status."""
        app_name = f"bx-{slug}"[:24]
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.api_base}/apps/{app_name}/machines",
                headers=self.headers,
            )
            
            if response.status_code != 200:
                return None
            
            machines = response.json()
            if not machines:
                return None
            
            machine = machines[0]
            return {
                "deployment_id": machine["id"],
                "status": machine.get("state", "unknown"),
                "url": f"https://{app_name}.fly.dev",
            }

