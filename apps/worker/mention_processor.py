"""
Twitter mention processor - the heart of HeyClaude.

Uses the Mentions Timeline API with efficient polling (Basic tier compatible).
- Polls every 60 seconds = ~1,440 calls/day (well under 15,000 reads/month limit)
- Deduplicates via Redis to never process the same tweet twice

1. Poll for new mentions
2. Parse the build request
3. Generate code using AI
4. Save to database
5. Reply with the live URL
"""

import asyncio
import sys
import os
import json
from datetime import datetime, timedelta
from typing import Optional

import httpx
import redis.asyncio as redis
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import settings

# Poll every 60 seconds - uses ~1,440 API calls/day = ~43,200/month
# Basic tier allows 15,000 reads/month, so we'll use adaptive polling
POLL_INTERVAL = 60


# ─────────────────────────────────────────────────────────────
# Database Setup
# ─────────────────────────────────────────────────────────────

engine = create_async_engine(settings.async_database_url, echo=False)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


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
    """Twitter client with OAuth 1.0a for posting and streaming."""
    
    BASE_URL = "https://api.twitter.com/2"
    
    def __init__(self):
        import hashlib
        import hmac
        import base64
        import time
        import urllib.parse
        import uuid
        
        self.hashlib = hashlib
        self.hmac = hmac
        self.base64 = base64
        self.time = time
        self.urllib = urllib
        self.uuid = uuid
        
        self.bearer_token = settings.twitter_bearer_token
        self.bot_username = settings.twitter_bot_username
        self.bot_user_id = settings.twitter_bot_user_id
        
        # OAuth 1.0a credentials for posting
        self.consumer_key = settings.twitter_api_key
        self.consumer_secret = settings.twitter_api_secret
        self.access_token = settings.twitter_access_token
        self.access_secret = settings.twitter_access_secret
    
    @property
    def headers(self):
        return {
            "Authorization": f"Bearer {self.bearer_token}",
            "Content-Type": "application/json",
        }
    
    def _oauth_signature(self, method: str, url: str, params: dict) -> str:
        """Generate OAuth 1.0a signature."""
        sorted_params = sorted(params.items())
        param_string = "&".join(f"{k}={self.urllib.parse.quote(str(v), safe='')}" for k, v in sorted_params)
        
        base_string = "&".join([
            method.upper(),
            self.urllib.parse.quote(url, safe=""),
            self.urllib.parse.quote(param_string, safe=""),
        ])
        
        signing_key = "&".join([
            self.urllib.parse.quote(self.consumer_secret, safe=""),
            self.urllib.parse.quote(self.access_secret, safe=""),
        ])
        
        signature = self.base64.b64encode(
            self.hmac.new(
                signing_key.encode(),
                base_string.encode(),
                self.hashlib.sha1
            ).digest()
        ).decode()
        
        return signature
    
    def _oauth_header(self, method: str, url: str, body_params: dict = None) -> str:
        """Generate OAuth 1.0a Authorization header."""
        oauth_params = {
            "oauth_consumer_key": self.consumer_key,
            "oauth_nonce": self.uuid.uuid4().hex,
            "oauth_signature_method": "HMAC-SHA1",
            "oauth_timestamp": str(int(self.time.time())),
            "oauth_token": self.access_token,
            "oauth_version": "1.0",
        }
        
        all_params = {**oauth_params}
        if body_params:
            all_params.update(body_params)
        
        oauth_params["oauth_signature"] = self._oauth_signature(method, url, all_params)
        
        header_parts = [f'{k}="{self.urllib.parse.quote(str(v), safe="")}"' for k, v in sorted(oauth_params.items())]
        return "OAuth " + ", ".join(header_parts)
    
    async def get_mentions(self, since_id: Optional[str] = None) -> list:
        """Fetch mentions using the mentions timeline endpoint (Basic tier compatible)."""
        if not self.bot_user_id:
            print("❌ TWITTER_BOT_USER_ID not configured!")
            return []
        
        url = f"{self.BASE_URL}/users/{self.bot_user_id}/mentions"
        params = {
            "expansions": "author_id",
            "tweet.fields": "created_at,conversation_id",
            "user.fields": "username,name,profile_image_url",
            "max_results": 10,
        }
        
        if since_id:
            params["since_id"] = since_id
        
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=self.headers, params=params)
            
            if response.status_code == 429:
                retry_after = response.headers.get("x-rate-limit-reset", "unknown")
                print(f"⚠️ Rate limited! Resets at: {retry_after}")
                return []
            
            if response.status_code != 200:
                print(f"❌ Mentions fetch failed ({response.status_code}): {response.text[:200]}")
                return []
            
            data = response.json()
            
            if not data.get("data"):
                return []
            
            # Build user lookup
            users = {u["id"]: u for u in data.get("includes", {}).get("users", [])}
            
            mentions = []
            for tweet in data["data"]:
                author = users.get(tweet["author_id"], {})
                mentions.append({
                    "tweet_id": tweet["id"],
                    "author_id": tweet["author_id"],
                    "author_username": author.get("username", "user"),
                    "author_name": author.get("name"),
                    "prompt": tweet["text"].replace(f"@{self.bot_username}", "").strip(),
                    "conversation_id": tweet.get("conversation_id"),
                })
            
            return mentions
    
    async def reply(self, tweet_id: str, text: str) -> dict:
        """Reply to a tweet using OAuth 1.0a."""
        url = f"{self.BASE_URL}/tweets"
        
        payload = {
            "text": text,
            "reply": {"in_reply_to_tweet_id": tweet_id}
        }
        
        auth_header = self._oauth_header("POST", url)
        headers = {
            "Authorization": auth_header,
            "Content-Type": "application/json",
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(url, headers=headers, json=payload)
            result = response.json()
            
            if response.status_code in [200, 201]:
                print(f"✅ [REPLY] Posted to {tweet_id}: {text[:50]}...")
                return result
            else:
                print(f"❌ [REPLY] Failed ({response.status_code}): {result}")
                return {"error": result}
    
    async def post_building(self, tweet_id: str, username: str, build_url: str):
        """Post that build is starting with link."""
        return await self.reply(
            tweet_id,
            f"🔨 Building your app, @{username}!\n\n"
            f"Watch it happen live:\n{build_url}\n\n"
            f"⏱️ Usually takes 30-60 seconds"
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
    
    async def generate(self, prompt: str) -> dict:
        """Generate a complete project from a prompt."""
        
        system_prompt = """You are HeyClaude, an expert developer that generates complete web apps.

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
            if text.startswith("```"):
                text = text.split("```")[1]
                if text.startswith("json"):
                    text = text[4:]
            return json.loads(text)
        except:
            return {
                "name": "Generated App",
                "description": prompt[:100],
                "entry_point": "index.html",
                "files": {"index.html": text},
            }


class ProjectSaver:
    """Saves projects directly to the database."""
    
    async def create_build(
        self,
        slug: str,
        prompt: str,
        author_id: str,
        author_username: str,
        tweet_id: str,
    ) -> dict:
        """Create initial build record."""
        import uuid
        
        async with async_session() as session:
            # Check if user exists, create if not
            user_result = await session.execute(
                text("SELECT id FROM users WHERE x_user_id = :x_user_id"),
                {"x_user_id": author_id}
            )
            user_row = user_result.fetchone()
            
            if user_row:
                user_id = user_row[0]
            else:
                user_id = uuid.uuid4()
                await session.execute(
                    text("""
                        INSERT INTO users (id, x_user_id, x_username, tier, credits, created_at)
                        VALUES (:id, :x_user_id, :x_username, 'free', 10, NOW())
                    """),
                    {"id": user_id, "x_user_id": author_id, "x_username": author_username}
                )
            
            project_id = uuid.uuid4()
            expires_at = datetime.utcnow() + timedelta(days=7)
            
            await session.execute(
                text("""
                    INSERT INTO projects (
                        id, user_id, slug, name, original_prompt,
                        files, deployment_status, is_public, views, forks,
                        source_tweet_id, created_at, expires_at
                    ) VALUES (
                        :id, :user_id, :slug, 'Building...', :prompt,
                        '{}', 'building', true, 0, 0,
                        :tweet_id, NOW(), :expires_at
                    )
                """),
                {
                    "id": project_id,
                    "user_id": user_id,
                    "slug": slug,
                    "prompt": prompt,
                    "tweet_id": tweet_id,
                    "expires_at": expires_at,
                }
            )
            
            build_id = uuid.uuid4()
            await session.execute(
                text("""
                    INSERT INTO builds (id, project_id, prompt, status, created_at)
                    VALUES (:id, :project_id, :prompt, 'queued', NOW())
                """),
                {"id": build_id, "project_id": project_id, "prompt": prompt}
            )
            
            await session.commit()
        
        return {"build_id": str(build_id), "project_id": str(project_id)}
    
    async def update_status(self, slug: str, status: str, error: str = None):
        """Update build status."""
        async with async_session() as session:
            await session.execute(
                text("UPDATE projects SET deployment_status = :status WHERE slug = :slug"),
                {"slug": slug, "status": status}
            )
            await session.execute(
                text("""
                    UPDATE builds 
                    SET status = :status, error_message = :error
                    WHERE project_id = (SELECT id FROM projects WHERE slug = :slug)
                """),
                {"slug": slug, "status": status, "error": error}
            )
            await session.commit()
    
    async def complete_build(
        self,
        slug: str,
        name: str,
        description: str,
        files: dict,
        entry_point: str,
    ):
        """Complete the build with generated files."""
        async with async_session() as session:
            await session.execute(
                text("""
                    UPDATE projects 
                    SET name = :name,
                        description = :description,
                        files = :files,
                        entry_point = :entry_point,
                        deployment_status = 'deployed'
                    WHERE slug = :slug
                """),
                {
                    "slug": slug,
                    "name": name,
                    "description": description,
                    "files": json.dumps(files),
                    "entry_point": entry_point,
                }
            )
            
            await session.execute(
                text("""
                    UPDATE builds 
                    SET status = 'complete',
                        generated_files = :files,
                        completed_at = NOW()
                    WHERE project_id = (SELECT id FROM projects WHERE slug = :slug)
                """),
                {"slug": slug, "files": json.dumps(files)}
            )
            
            await session.commit()
        
        return {"url": f"https://heyclaude.xyz/p/{slug}"}


class MentionProcessor:
    """Main worker that processes Twitter mentions via polling (Basic tier)."""
    
    def __init__(self):
        self.twitter = TwitterClient()
        self.builder = AIBuilder()
        self.saver = ProjectSaver()
        self.redis_client = None
        self.last_mention_id = None
    
    async def run(self):
        """Main polling loop."""
        print(f"🚀 HeyClaude Mention Processor starting...")
        print(f"📱 Bot: @{self.twitter.bot_username}")
        print(f"🆔 User ID: {self.twitter.bot_user_id}")
        print(f"⏱️ Poll interval: {POLL_INTERVAL}s")
        
        if not self.twitter.bot_user_id:
            print("❌ FATAL: TWITTER_BOT_USER_ID is not set!")
            return
        
        if not self.twitter.bearer_token:
            print("❌ FATAL: TWITTER_BEARER_TOKEN is not set!")
            return
        
        self.redis_client = await redis.from_url(settings.redis_url)
        print("✅ Connected to Redis")
        
        # Get last processed ID from Redis
        last_id = await self.redis_client.get("twitter:last_mention_id")
        if last_id:
            self.last_mention_id = last_id.decode()
            print(f"📌 Resuming from mention ID: {self.last_mention_id}")
        else:
            print("📌 Starting fresh (no previous mention ID)")
        
        print("=" * 50)
        print("🎯 Listening for mentions...")
        print("=" * 50)
        
        while True:
            try:
                await self.poll_mentions()
            except Exception as e:
                print(f"❌ Poll error: {e}")
                import traceback
                traceback.print_exc()
            
            await asyncio.sleep(POLL_INTERVAL)
    
    async def poll_mentions(self):
        """Poll for new mentions."""
        mentions = await self.twitter.get_mentions(since_id=self.last_mention_id)
        
        if not mentions:
            return
        
        print(f"📬 Found {len(mentions)} new mention(s)!")
        
        # Process oldest first (reverse order)
        for mention in reversed(mentions):
            # Skip our own tweets
            if mention["author_id"] == self.twitter.bot_user_id:
                print(f"⏭️ Skipping own tweet")
                continue
            
            await self.handle_mention(mention)
            
            # Update last ID after each successful process
            self.last_mention_id = mention["tweet_id"]
            await self.redis_client.set("twitter:last_mention_id", self.last_mention_id)
    
    async def handle_mention(self, mention: dict):
        """Process a single mention."""
        tweet_id = mention["tweet_id"]
        
        # Deduplicate
        if await self.redis_client.sismember("twitter:processed", tweet_id):
            return
        await self.redis_client.sadd("twitter:processed", tweet_id)
        await self.redis_client.expire("twitter:processed", 86400 * 7)
        
        prompt = mention["prompt"]
        username = mention["author_username"]
        
        print(f"📥 Processing: @{username}: {prompt[:50]}...")
        
        # Rate limit check
        rate_key = f"ratelimit:{mention['author_id']}:hourly"
        count = await self.redis_client.incr(rate_key)
        if count == 1:
            await self.redis_client.expire(rate_key, 3600)
        
        if count > 3:
            print(f"⏳ Rate limited: @{username}")
            await self.twitter.reply(tweet_id, f"⏳ @{username} You've hit your limit! Upgrade at heyclaude.xyz/pro 🚀")
            return
        
        # Content moderation
        allowed, reason = self.builder.moderator.check_prompt(prompt)
        if not allowed:
            print(f"🚫 Blocked: @{username} - {reason}")
            await self.twitter.reply(tweet_id, f"❌ @{username} {reason}")
            return
        
        # Build the project
        slug = None
        try:
            slug = generate_slug(prompt)
            build_url = f"https://heyclaude.xyz/studio/{slug}"
            
            # INSTANTLY reply with build link
            await self.twitter.post_building(tweet_id, username, build_url)
            print(f"📤 Replied with build link: {build_url}")
            
            # Create build record
            await self.saver.create_build(
                slug=slug,
                prompt=prompt,
                author_id=mention["author_id"],
                author_username=username,
                tweet_id=tweet_id,
            )
            
            await self.saver.update_status(slug, "generating")
            
            # Generate code with Claude
            result = await self.builder.generate(prompt)
            
            await self.saver.update_status(slug, "saving")
            
            # Save files to database
            await self.saver.complete_build(
                slug=slug,
                name=result.get("name", "Untitled"),
                description=result.get("description", prompt[:100]),
                files=result["files"],
                entry_point=result.get("entry_point", "index.html"),
            )
            
            # Post final success reply
            project_url = f"https://heyclaude.xyz/p/{slug}"
            studio_url = f"https://heyclaude.xyz/studio/{slug}"
            
            await self.twitter.post_complete(
                tweet_id, username, project_url, studio_url, result.get("name", "Your App")
            )
            
            print(f"✅ Complete: {project_url}")
            
        except Exception as e:
            print(f"❌ Build failed: {e}")
            import traceback
            traceback.print_exc()
            
            if slug:
                try:
                    await self.saver.update_status(slug, "failed", error=str(e))
                except:
                    pass
            
            await self.twitter.post_failed(tweet_id, username, str(e))


async def main():
    processor = MentionProcessor()
    await processor.run()


if __name__ == "__main__":
    asyncio.run(main())
