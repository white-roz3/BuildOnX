"""
Twitter mention processor - the heart of BuildOnX.

This worker listens for @BuildAppsOnX mentions and orchestrates the build pipeline:
1. Detect new mentions
2. Parse the build request
3. Generate code using AI
4. Deploy to Fly.io
5. Reply with the live URL
"""

import asyncio
import sys
import os
from datetime import datetime, timedelta
from typing import Optional

import redis.asyncio as redis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import settings


# ─────────────────────────────────────────────────────────────
# Database Setup
# ─────────────────────────────────────────────────────────────

engine = create_async_engine(settings.async_database_url, echo=False)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


# ─────────────────────────────────────────────────────────────
# Import services from API app
# ─────────────────────────────────────────────────────────────

# We'll import inline to avoid circular dependencies
# In production, you'd have a shared package


def generate_slug(text: str) -> str:
    """Generate a URL-friendly slug."""
    import random
    import string
    from slugify import slugify
    
    words = text.lower().split()
    stop_words = {"a", "an", "the", "make", "me", "create", "build", "with", "and", "or", "for"}
    meaningful = [w for w in words if w not in stop_words][:4] or words[:2] or ["project"]
    
    base = slugify(" ".join(meaningful), max_length=42)
    suffix = "".join(random.choices(string.ascii_lowercase + string.digits, k=4))
    
    return f"{base}-{suffix}" if base else f"project-{suffix}"


class TwitterClient:
    """Minimal Twitter client for the worker."""
    
    BASE_URL = "https://api.twitter.com/2"
    
    def __init__(self):
        import httpx
        self.httpx = httpx
        self.bearer_token = settings.twitter_bearer_token
        self.bot_username = settings.twitter_bot_username
        self.bot_user_id = settings.twitter_bot_user_id
    
    @property
    def headers(self):
        return {
            "Authorization": f"Bearer {self.bearer_token}",
            "Content-Type": "application/json",
        }
    
    async def poll_mentions(self, since_id: Optional[str] = None) -> list:
        """Poll for recent mentions."""
        url = f"{self.BASE_URL}/users/{self.bot_user_id}/mentions"
        params = {
            "max_results": 100,
            "expansions": "author_id",
            "tweet.fields": "created_at,conversation_id",
            "user.fields": "username,name,profile_image_url",
        }
        
        if since_id:
            params["since_id"] = since_id
        
        async with self.httpx.AsyncClient() as client:
            response = await client.get(url, headers=self.headers, params=params)
            data = response.json()
            
            if "data" not in data:
                return []
            
            users = {u["id"]: u for u in data.get("includes", {}).get("users", [])}
            mentions = []
            
            for tweet in data["data"]:
                author = users.get(tweet["author_id"], {})
                prompt = tweet["text"].replace(f"@{self.bot_username}", "").strip()
                
                mentions.append({
                    "tweet_id": tweet["id"],
                    "author_id": tweet["author_id"],
                    "author_username": author.get("username", "user"),
                    "author_name": author.get("name"),
                    "author_image": author.get("profile_image_url"),
                    "prompt": prompt,
                    "conversation_id": tweet.get("conversation_id"),
                    "created_at": tweet.get("created_at"),
                })
            
            return mentions
    
    async def reply(self, tweet_id: str, text: str) -> dict:
        """Reply to a tweet (simplified - needs OAuth 1.0a in production)."""
        # This is a placeholder - full implementation needs OAuth signing
        print(f"[REPLY] To {tweet_id}: {text[:100]}...")
        return {"data": {"id": "mock_reply_id"}}
    
    async def post_building(self, tweet_id: str, username: str):
        """Post that build is starting."""
        return await self.reply(
            tweet_id,
            f"🔨 Building your app, @{username}...\n\nThis usually takes 30-60 seconds."
        )
    
    async def post_complete(self, tweet_id: str, username: str, project_url: str, studio_url: str, name: str):
        """Post build completion."""
        return await self.reply(
            tweet_id,
            f"✅ Done! Your app \"{name}\" is live:\n\n"
            f"🌐 {project_url}\n"
            f"🛠️ Edit: {studio_url}\n\n"
            f"Reply to this tweet to refine your project!"
        )
    
    async def post_failed(self, tweet_id: str, username: str, error: str):
        """Post build failure."""
        error_short = error[:80] + "..." if len(error) > 80 else error
        return await self.reply(
            tweet_id,
            f"❌ Build failed, @{username}\n\n"
            f"Error: {error_short}\n\n"
            f"Try simplifying your request!"
        )


class ContentModerator:
    """Content moderation for prompts and code."""
    
    DANGEROUS_PATTERNS = [
        r"(crypto|bitcoin)\s*(miner|mining)",
        r"keylog(ger|ging)",
        r"phishing",
        r"(fake|clone).*(login|signin|paypal|google|facebook|bank)",
        r"credential\s*(steal|harvest)",
        r"ransomware",
        r"reverse\s*shell",
    ]
    
    INJECTION_PATTERNS = [
        r"ignore\s+(previous|above|all)\s+(instructions?|prompts?)",
        r"you\s+are\s+now\s+",
        r"pretend\s+(you're|to\s+be)",
    ]
    
    def check_prompt(self, prompt: str) -> tuple[bool, str]:
        """Check if prompt is safe. Returns (allowed, reason)."""
        import re
        prompt_lower = prompt.lower()
        
        for pattern in self.INJECTION_PATTERNS:
            if re.search(pattern, prompt_lower):
                return False, "Request contains disallowed patterns"
        
        for pattern in self.DANGEROUS_PATTERNS:
            if re.search(pattern, prompt_lower):
                return False, "This type of application cannot be built"
        
        return True, ""


class AIBuilder:
    """AI code generation client."""
    
    def __init__(self):
        from anthropic import AsyncAnthropic
        self.client = AsyncAnthropic(api_key=settings.anthropic_api_key)
        self.moderator = ContentModerator()
    
    async def generate(self, prompt: str, template: str = "static-site") -> dict:
        """Generate a complete project from a prompt."""
        import json
        
        system_prompt = """You are BuildOnX, an expert developer that generates complete web apps.

Generate COMPLETE, WORKING code - no placeholders, no TODOs.
Dark mode by default, modern design, mobile responsive.

Respond with ONLY a JSON object:
{
    "name": "Short project name",
    "description": "One sentence description",
    "entry_point": "index.html",
    "files": {
        "index.html": "complete HTML content",
        "style.css": "if needed",
        "script.js": "if needed"
    }
}"""
        
        response = await self.client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=8000,
            system=system_prompt,
            messages=[{"role": "user", "content": f"Build this app: {prompt}"}],
        )
        
        text = response.content[0].text.strip()
        
        try:
            # Try to parse JSON
            if text.startswith("```"):
                text = text.split("```")[1]
                if text.startswith("json"):
                    text = text[4:]
            return json.loads(text)
        except:
            # Fallback
            return {
                "name": "Generated App",
                "description": prompt[:100],
                "entry_point": "index.html",
                "files": {"index.html": text},
            }


class Deployer:
    """Fly.io deployment client."""
    
    def __init__(self):
        import httpx
        import base64
        self.httpx = httpx
        self.base64 = base64
        self.token = settings.fly_api_token
        self.org = settings.fly_org
        self.api_base = "https://api.machines.dev/v1"
    
    @property
    def headers(self):
        return {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json",
        }
    
    async def deploy(self, project_id: str, slug: str, files: dict, entry_point: str = "index.html") -> dict:
        """Deploy files to Fly.io."""
        app_name = f"bx-{slug}"[:24]
        
        # Ensure app exists
        async with self.httpx.AsyncClient() as client:
            # Create app
            await client.post(
                f"{self.api_base}/apps",
                headers=self.headers,
                json={"app_name": app_name, "org_slug": self.org},
            )
            
            # Prepare files
            machine_files = []
            nginx_conf = self._nginx_config(entry_point)
            machine_files.append({
                "guest_path": "/etc/nginx/nginx.conf",
                "raw_value": self.base64.b64encode(nginx_conf.encode()).decode(),
            })
            
            for filename, content in files.items():
                if isinstance(content, bytes):
                    content = content.decode()
                machine_files.append({
                    "guest_path": f"/usr/share/nginx/html/{filename}",
                    "raw_value": self.base64.b64encode(content.encode()).decode(),
                })
            
            # Delete old machines
            existing = await client.get(f"{self.api_base}/apps/{app_name}/machines", headers=self.headers)
            if existing.status_code == 200:
                for m in existing.json():
                    await client.delete(
                        f"{self.api_base}/apps/{app_name}/machines/{m['id']}",
                        headers=self.headers,
                        params={"force": "true"},
                    )
            
            # Create machine
            response = await client.post(
                f"{self.api_base}/apps/{app_name}/machines",
                headers=self.headers,
                json={
                    "config": {
                        "image": "nginx:alpine",
                        "services": [{"ports": [{"port": 443, "handlers": ["tls", "http"]}], "protocol": "tcp", "internal_port": 8080}],
                        "files": machine_files,
                        "guest": {"cpu_kind": "shared", "cpus": 1, "memory_mb": 256},
                    }
                },
                timeout=60.0,
            )
            
            if response.status_code not in [200, 201]:
                raise Exception(f"Deployment failed: {response.text}")
            
            return {
                "url": f"https://{app_name}.fly.dev",
                "deployment_id": response.json()["id"],
            }
    
    def _nginx_config(self, entry_point: str) -> str:
        return f"""worker_processes auto;
pid /tmp/nginx.pid;
events {{ worker_connections 1024; }}
http {{
    include /etc/nginx/mime.types;
    client_body_temp_path /tmp/client_temp;
    proxy_temp_path /tmp/proxy_temp;
    fastcgi_temp_path /tmp/fastcgi_temp;
    uwsgi_temp_path /tmp/uwsgi_temp;
    scgi_temp_path /tmp/scgi_temp;
    server {{
        listen 8080;
        root /usr/share/nginx/html;
        index {entry_point};
        location / {{ try_files $uri $uri/ /{entry_point}; }}
        gzip on;
        gzip_types text/plain text/css application/json application/javascript;
    }}
}}"""


class MentionProcessor:
    """Main worker that processes Twitter mentions."""
    
    def __init__(self):
        self.twitter = TwitterClient()
        self.builder = AIBuilder()
        self.deployer = Deployer()
        self.redis = None
    
    async def run(self):
        """Main loop."""
        print("🚀 Starting BuildOnX mention processor...")
        
        self.redis = await redis.from_url(settings.redis_url)
        
        while True:
            try:
                await self.poll_and_process()
            except Exception as e:
                print(f"❌ Error in main loop: {e}")
            
            await asyncio.sleep(30)
    
    async def poll_and_process(self):
        """Poll for mentions and process them."""
        # Get last processed tweet ID
        last_id = await self.redis.get("twitter:last_mention_id")
        
        mentions = await self.twitter.poll_mentions(
            since_id=last_id.decode() if last_id else None
        )
        
        for mention in reversed(mentions):  # Oldest first
            await self.handle_mention(mention)
            await self.redis.set("twitter:last_mention_id", mention["tweet_id"])
    
    async def handle_mention(self, mention: dict):
        """Process a single mention."""
        tweet_id = mention["tweet_id"]
        
        # Deduplicate
        if await self.redis.sismember("twitter:processed", tweet_id):
            return
        await self.redis.sadd("twitter:processed", tweet_id)
        await self.redis.expire("twitter:processed", 86400 * 7)
        
        prompt = mention["prompt"]
        username = mention["author_username"]
        
        print(f"📥 Processing: @{username}: {prompt[:50]}...")
        
        # Rate limit check
        rate_key = f"ratelimit:{mention['author_id']}:hourly"
        count = await self.redis.incr(rate_key)
        if count == 1:
            await self.redis.expire(rate_key, 3600)
        
        if count > 3:
            print(f"⏳ Rate limited: @{username}")
            await self.twitter.reply(tweet_id, f"⏳ @{username} You've hit your limit! Upgrade at BuildOnX.app/pro 🚀")
            return
        
        # Check content moderation FIRST
        allowed, reason = self.builder.moderator.check_prompt(prompt)
        if not allowed:
            print(f"🚫 Blocked: @{username} - {reason}")
            await self.twitter.reply(tweet_id, f"❌ @{username} {reason}")
            return
        
        # Build the project
        try:
            # Notify building
            await self.twitter.post_building(tweet_id, username)
            
            # Generate code
            slug = generate_slug(prompt)
            result = await self.builder.generate(prompt)
            
            # Deploy
            deployment = await self.deployer.deploy(
                project_id=slug,
                slug=slug,
                files=result["files"],
                entry_point=result.get("entry_point", "index.html"),
            )
            
            # Post success
            project_url = deployment["url"]
            studio_url = f"https://BuildOnX.app/studio/{slug}"
            
            await self.twitter.post_complete(
                tweet_id, username, project_url, studio_url, result.get("name", "Your App")
            )
            
            print(f"✅ Deployed: {project_url}")
            
        except Exception as e:
            print(f"❌ Build failed: {e}")
            await self.twitter.post_failed(tweet_id, username, str(e))


async def main():
    processor = MentionProcessor()
    await processor.run()


if __name__ == "__main__":
    asyncio.run(main())

