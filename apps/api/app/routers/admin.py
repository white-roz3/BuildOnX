"""
Admin routes for analytics and system management.
"""

import json
import hmac
import hashlib
import base64
import time
import urllib.parse
from datetime import datetime, timedelta
from uuid import uuid4
from typing import Optional, Dict, List

from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy import text
import httpx
import redis.asyncio as aioredis

from app.config import settings
from app.services.analytics import analytics
from app.services.cleanup import cleanup
from app.database import async_session

router = APIRouter(prefix="/admin", tags=["admin"])

# ─────────────────────────────────────────────────────────────
# Redis-based reply tracking (persists across restarts)
# ─────────────────────────────────────────────────────────────

MAX_REPLIES_PER_TWEET = 2  # Maximum replies allowed per tweet to prevent spam
REPLY_COUNT_PREFIX = "heyclaude:reply_count:"
REPLY_COUNT_TTL = 60 * 60 * 24 * 7  # 7 days

_redis_client: Optional[aioredis.Redis] = None

async def get_redis() -> Optional[aioredis.Redis]:
    """Get or create Redis connection."""
    global _redis_client
    if _redis_client is None:
        try:
            _redis_client = await aioredis.from_url(
                settings.redis_url,
                encoding="utf-8",
                decode_responses=True
            )
            await _redis_client.ping()
            print("✅ Redis connected for reply tracking")
        except Exception as e:
            print(f"⚠️ Redis not available: {e}")
            _redis_client = None
    return _redis_client

async def get_reply_count(tweet_id: str) -> int:
    """Get the number of replies sent to a tweet (from Redis)."""
    redis = await get_redis()
    if redis:
        try:
            count = await redis.get(f"{REPLY_COUNT_PREFIX}{tweet_id}")
            return int(count) if count else 0
        except Exception as e:
            print(f"⚠️ Redis get error: {e}")
    # Fallback to in-memory
    return _twitter_state.get("reply_counts", {}).get(tweet_id, 0)

async def increment_reply_count(tweet_id: str) -> int:
    """Increment and return the reply count for a tweet (persisted in Redis)."""
    redis = await get_redis()
    if redis:
        try:
            key = f"{REPLY_COUNT_PREFIX}{tweet_id}"
            new_count = await redis.incr(key)
            await redis.expire(key, REPLY_COUNT_TTL)
            return new_count
        except Exception as e:
            print(f"⚠️ Redis incr error: {e}")
    # Fallback to in-memory
    if "reply_counts" not in _twitter_state:
        _twitter_state["reply_counts"] = {}
    _twitter_state["reply_counts"][tweet_id] = _twitter_state["reply_counts"].get(tweet_id, 0) + 1
    return _twitter_state["reply_counts"][tweet_id]

# ─────────────────────────────────────────────────────────────
# In-memory state for Twitter bot (non-persistent stuff)
# ─────────────────────────────────────────────────────────────

_twitter_state: Dict = {
    "mentions": {},  # tweet_id -> mention data
    "queue": [],     # processing queue
    "processed_ids": set(),  # tweets we've started processing
    "reply_counts": {},  # fallback if Redis unavailable
    "rate_limit_remaining": 450,
    "rate_limit_reset": None,
}

# ─────────────────────────────────────────────────────────────
# Build Request Detection
# ─────────────────────────────────────────────────────────────

# Keywords that indicate a build request
BUILD_KEYWORDS = [
    "make me", "build me", "create me", "build a", "make a", "create a",
    "can you make", "can you build", "can you create",
    "i want", "i need", "give me",
    "website", "app", "page", "site", "dashboard", "tool",
    "landing page", "portfolio", "blog", "store", "shop",
    "calculator", "tracker", "timer", "game", "quiz",
]

# Words that indicate NOT a build request (just chatting/replying)
IGNORE_KEYWORDS = [
    "thanks", "thank you", "cool", "nice", "awesome", "great",
    "lol", "lmao", "haha", "wow", "ok", "okay",
    "how are you", "what's up", "hello", "hi", "hey",
    "follow", "dm", "message",
    "doesn't work", "not working", "broken", "error", "bug",
]

def is_build_request(text: str) -> bool:
    """Check if a tweet is actually requesting to build something."""
    text_lower = text.lower()
    
    # Remove the bot mention
    text_lower = text_lower.replace(f"@{settings.twitter_bot_username.lower()}", "").strip()
    
    # If too short, probably not a build request
    if len(text_lower) < 10:
        return False
    
    # Check for ignore keywords first (just chatting)
    for keyword in IGNORE_KEYWORDS:
        if keyword in text_lower and len(text_lower) < 50:
            return False
    
    # Check for build keywords
    for keyword in BUILD_KEYWORDS:
        if keyword in text_lower:
            return True
    
    # If it's a longer message (50+ chars) without ignore keywords, assume it's a build request
    if len(text_lower) >= 50:
        return True
    
    return False


# ─────────────────────────────────────────────────────────────
# Simple API Key Auth for Admin Endpoints
# ─────────────────────────────────────────────────────────────

def verify_admin_key(x_admin_key: str = None):
    """Verify admin API key from header."""
    expected = getattr(settings, "admin_api_key", None)
    
    # In debug mode, allow without key
    if settings.debug and not expected:
        return True
    
    if not x_admin_key or x_admin_key != expected:
        raise HTTPException(status_code=403, detail="Invalid admin key")
    
    return True


# ─────────────────────────────────────────────────────────────
# Analytics Endpoints
# ─────────────────────────────────────────────────────────────

@router.get("/stats")
async def get_dashboard_stats(_: bool = Depends(verify_admin_key)):
    """Get overview stats for admin dashboard."""
    return await analytics.get_dashboard_stats()


@router.get("/popular")
async def get_popular_projects(
    limit: int = Query(default=10, ge=1, le=50),
    _: bool = Depends(verify_admin_key),
):
    """Get most popular projects."""
    return await analytics.get_popular_projects(limit=limit)


@router.get("/builds/recent")
async def get_recent_builds(
    limit: int = Query(default=20, ge=1, le=100),
    _: bool = Depends(verify_admin_key),
):
    """Get recent build activity."""
    return await analytics.get_recent_builds(limit=limit)


@router.get("/builds/by-day")
async def get_builds_by_day(
    days: int = Query(default=30, ge=1, le=90),
    _: bool = Depends(verify_admin_key),
):
    """Get daily build stats for charting."""
    return await analytics.get_build_stats_by_day(days=days)


@router.get("/templates")
async def get_template_usage(_: bool = Depends(verify_admin_key)):
    """Get template usage breakdown."""
    return await analytics.get_template_usage()


# ─────────────────────────────────────────────────────────────
# Cleanup Endpoints
# ─────────────────────────────────────────────────────────────

@router.post("/cleanup/expired")
async def cleanup_expired_projects(_: bool = Depends(verify_admin_key)):
    """Manually trigger cleanup of expired projects."""
    result = await cleanup.cleanup_expired_projects()
    return {"status": "completed", **result}


@router.post("/cleanup/failed")
async def cleanup_failed_deployments(_: bool = Depends(verify_admin_key)):
    """Clean up stuck/failed deployments."""
    result = await cleanup.cleanup_failed_deployments()
    return {"status": "completed", **result}


@router.post("/cleanup/all")
async def run_full_cleanup(_: bool = Depends(verify_admin_key)):
    """Run all cleanup tasks."""
    result = await cleanup.run_all_cleanup()
    return {"status": "completed", **result}


@router.get("/resources")
async def get_resource_stats(_: bool = Depends(verify_admin_key)):
    """Get resource usage stats."""
    return await cleanup.get_resource_stats()


# ─────────────────────────────────────────────────────────────
# System Endpoints
# ─────────────────────────────────────────────────────────────

@router.get("/health/detailed")
async def detailed_health_check(_: bool = Depends(verify_admin_key)):
    """Detailed health check with component status."""
    from app.database import engine
    import redis.asyncio as redis
    
    health = {"status": "healthy", "components": {}}
    
    # Check database
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        health["components"]["database"] = "healthy"
    except Exception as e:
        health["components"]["database"] = f"unhealthy: {str(e)}"
        health["status"] = "degraded"
    
    # Check Redis
    try:
        r = await redis.from_url(settings.redis_url)
        await r.ping()
        await r.close()
        health["components"]["redis"] = "healthy"
    except Exception as e:
        health["components"]["redis"] = f"unhealthy: {str(e)}"
        health["status"] = "degraded"
    
    return health


# ═══════════════════════════════════════════════════════════════
# TWITTER BOT ADMIN ENDPOINTS
# ═══════════════════════════════════════════════════════════════

class DeployRequest(BaseModel):
    tweet_id: str

class ReplyRequest(BaseModel):
    tweet_id: str
    custom_message: Optional[str] = None


def generate_slug(text: str) -> str:
    """Generate a URL-friendly slug."""
    import random
    import string
    from slugify import slugify
    
    words = text.lower().split()
    stop_words = {"a", "an", "the", "make", "me", "create", "build", "with", "and", "or", "for", "@heyclaude"}
    meaningful = [w for w in words if w not in stop_words and not w.startswith("@")][:4]
    if not meaningful:
        meaningful = ["project"]
    
    base = slugify(" ".join(meaningful), max_length=42)
    suffix = "".join(random.choices(string.ascii_lowercase + string.digits, k=4))
    
    return f"{base}-{suffix}" if base else f"project-{suffix}"


async def twitter_oauth_header(method: str, url: str) -> str:
    """Generate OAuth 1.0a Authorization header for Twitter."""
    oauth_params = {
        "oauth_consumer_key": settings.twitter_api_key,
        "oauth_nonce": uuid4().hex,
        "oauth_signature_method": "HMAC-SHA1",
        "oauth_timestamp": str(int(time.time())),
        "oauth_token": settings.twitter_access_token,
        "oauth_version": "1.0",
    }
    
    sorted_params = sorted(oauth_params.items())
    param_string = "&".join(f"{k}={urllib.parse.quote(str(v), safe='')}" for k, v in sorted_params)
    
    base_string = "&".join([
        method.upper(),
        urllib.parse.quote(url, safe=""),
        urllib.parse.quote(param_string, safe=""),
    ])
    
    signing_key = "&".join([
        urllib.parse.quote(settings.twitter_api_secret, safe=""),
        urllib.parse.quote(settings.twitter_access_secret, safe=""),
    ])
    
    signature = base64.b64encode(
        hmac.new(
            signing_key.encode(),
            base_string.encode(),
            hashlib.sha1
        ).digest()
    ).decode()
    
    oauth_params["oauth_signature"] = signature
    header_parts = [f'{k}="{urllib.parse.quote(str(v), safe="")}"' for k, v in sorted(oauth_params.items())]
    
    return "OAuth " + ", ".join(header_parts)


async def fetch_twitter_mentions(auto_process: bool = True) -> List[Dict]:
    """Fetch recent mentions from Twitter API v2 and optionally auto-process them."""
    global _twitter_state
    
    # Check if bot is enabled
    if auto_process and not settings.twitter_bot_enabled:
        auto_process = False
        print("⚠️ Bot is disabled (TWITTER_BOT_ENABLED=false)")
    
    if not settings.twitter_bearer_token:
        return []
    
    # Search for mentions
    url = "https://api.twitter.com/2/tweets/search/recent"
    params = {
        "query": f"@{settings.twitter_bot_username} -is:retweet",
        "max_results": 20,
        "expansions": "author_id",
        "tweet.fields": "created_at,conversation_id",
        "user.fields": "username,name,profile_image_url",
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.get(
            url,
            headers={"Authorization": f"Bearer {settings.twitter_bearer_token}"},
            params=params,
        )
        
        # Update rate limits
        _twitter_state["rate_limit_remaining"] = int(
            response.headers.get("x-rate-limit-remaining", 450)
        )
        reset_time = response.headers.get("x-rate-limit-reset")
        if reset_time:
            _twitter_state["rate_limit_reset"] = datetime.fromtimestamp(
                int(reset_time)
            ).isoformat()
        
        if response.status_code != 200:
            print(f"Twitter API error: {response.status_code} - {response.text}")
            return []
        
        data = response.json()
        
        if not data.get("data"):
            return []
        
        # Build user lookup
        users = {u["id"]: u for u in data.get("includes", {}).get("users", [])}
        
        mentions = []
        new_mentions_to_process = []
        
        for tweet in data["data"]:
            author = users.get(tweet["author_id"], {})
            
            # Skip if already processed
            if tweet["id"] in _twitter_state["processed_ids"]:
                # But still include in list for display
                existing = _twitter_state["mentions"].get(tweet["id"])
                if existing:
                    mentions.append(existing)
                continue
            
            # Skip our own tweets
            if author.get("username", "").lower() == settings.twitter_bot_username.lower():
                continue
            
            mention = {
                "id": tweet["id"],
                "author_id": tweet["author_id"],
                "author_username": author.get("username", "unknown"),
                "author_name": author.get("name", ""),
                "text": tweet["text"],
                "created_at": tweet["created_at"],
                "status": "pending",
                "deployment_url": None,
                "reply_id": None,
                "error": None,
                "project_slug": None,
            }
            
            # Check if we have existing state
            if tweet["id"] in _twitter_state["mentions"]:
                mention.update(_twitter_state["mentions"][tweet["id"]])
            else:
                _twitter_state["mentions"][tweet["id"]] = mention
                
                # This is a NEW mention - check if it's a valid build request
                if auto_process and mention["status"] == "pending":
                    if is_build_request(tweet["text"]):
                        new_mentions_to_process.append(tweet["id"])
                        print(f"✅ Valid build request detected: {tweet['text'][:50]}...")
                    else:
                        # Mark as skipped so we don't process it again
                        mention["status"] = "skipped"
                        _twitter_state["processed_ids"].add(tweet["id"])
                        print(f"⏭️ Skipping non-build tweet: {tweet['text'][:50]}...")
            
            mentions.append(mention)
        
        # Auto-process new mentions in background
        if new_mentions_to_process:
            import asyncio
            for tweet_id in new_mentions_to_process:
                print(f"🤖 Auto-processing build request: {tweet_id}")
                asyncio.create_task(process_deployment(tweet_id))
        
        return sorted(mentions, key=lambda x: x["created_at"], reverse=True)


async def reply_to_tweet(tweet_id: str, message: str, force: bool = False) -> Optional[str]:
    """Post a reply to a tweet. Returns reply tweet ID on success.
    
    SPAM PREVENTION: Maximum 2 replies per tweet allowed.
    This prevents spam that could get the account suspended.
    Reply counts are persisted in Redis to survive service restarts.
    """
    global _twitter_state
    url = "https://api.twitter.com/2/tweets"
    
    # SPAM PREVENTION - Check reply count from Redis (max 2 per tweet)
    current_count = await get_reply_count(tweet_id)
    if current_count >= MAX_REPLIES_PER_TWEET:
        if not force:
            print(f"⚠️ SKIPPING reply to {tweet_id} - already sent {current_count} replies (max {MAX_REPLIES_PER_TWEET})")
            return None
        print(f"⚠️ FORCE replying to {tweet_id} (already sent {current_count} replies)")
    
    # Check credentials
    if not settings.twitter_api_key or not settings.twitter_access_token:
        print(f"❌ REPLY ERROR: Missing Twitter credentials!")
        print(f"   API Key: {'SET' if settings.twitter_api_key else 'MISSING'}")
        print(f"   API Secret: {'SET' if settings.twitter_api_secret else 'MISSING'}")
        print(f"   Access Token: {'SET' if settings.twitter_access_token else 'MISSING'}")
        print(f"   Access Secret: {'SET' if settings.twitter_access_secret else 'MISSING'}")
        return None
    
    auth_header = await twitter_oauth_header("POST", url)
    
    payload = {
        "text": message,
        "reply": {"in_reply_to_tweet_id": tweet_id}
    }
    
    print(f"📤 Attempting to reply to tweet {tweet_id}...")
    print(f"   Message: {message[:50]}...")
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            url,
            headers={
                "Authorization": auth_header,
                "Content-Type": "application/json",
            },
            json=payload
        )
        
        print(f"   Response status: {response.status_code}")
        
        if response.status_code in [200, 201]:
            data = response.json()
            reply_id = data.get("data", {}).get("id")
            
            # INCREMENT REPLY COUNT IN REDIS (persists across restarts)
            new_count = await increment_reply_count(tweet_id)
            _twitter_state["processed_ids"].add(tweet_id)
            
            print(f"✅ Reply posted successfully! Reply ID: {reply_id} (reply {new_count}/{MAX_REPLIES_PER_TWEET} for this tweet)")
            
            return reply_id
        else:
            print(f"❌ Reply failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return None


async def process_deployment(tweet_id: str):
    """Process deployment for a tweet."""
    global _twitter_state
    
    mention = _twitter_state["mentions"].get(tweet_id)
    if not mention:
        return
    
    try:
        # Update status
        mention["status"] = "building"
        _twitter_state["queue"].append({
            "tweet_id": tweet_id,
            "author_username": mention["author_username"],
            "prompt": mention["text"],
            "status": "building",
            "started_at": datetime.utcnow().isoformat(),
        })
        
        # Generate slug
        prompt = mention["text"].replace(f"@{settings.twitter_bot_username}", "").strip()
        slug = generate_slug(prompt)
        mention["project_slug"] = slug
        
        # Reply that we're building - link directly to studio
        building_reply = await reply_to_tweet(
            tweet_id,
            f"Hey @{mention['author_username']}! 👋\n\n"
            f"Building your app now! Watch it come to life:\n"
            f"🔗 https://heyclaude.app/studio/{slug}\n\n"
            f"You can edit it as soon as it's ready ✨"
        )
        
        async with async_session() as db:
            # Upsert user - insert if not exists, otherwise get existing
            user_id = uuid4()
            await db.execute(
                text("""
                    INSERT INTO users (id, x_user_id, x_username, tier, credits, created_at)
                    VALUES (:id, :x_user_id, :x_username, 'free', 10, NOW())
                    ON CONFLICT (x_user_id) DO NOTHING
                """),
                {"id": user_id, "x_user_id": mention["author_id"], "x_username": mention["author_username"]}
            )
            
            # Get the actual user ID (whether just inserted or already existed)
            user_result = await db.execute(
                text("SELECT id FROM users WHERE x_user_id = :x_user_id"),
                {"x_user_id": mention["author_id"]}
            )
            user_row = user_result.fetchone()
            user_id = user_row[0]
            
            # Create project
            project_id = uuid4()
            expires_at = datetime.utcnow() + timedelta(days=7)
            
            await db.execute(
                text("""
                    INSERT INTO projects (
                        id, user_id, slug, name, original_prompt,
                        files, deployment_status, is_public, views, forks,
                        source_tweet_id, created_at, expires_at, template, tech_stack, entry_point
                    ) VALUES (
                        :id, :user_id, :slug, 'Building...', :prompt,
                        '{}', 'building', true, 0, 0,
                        :tweet_id, NOW(), :expires_at, 'static-site', '{}', 'index.html'
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
            await db.commit()
            
            # Generate with Claude
            from anthropic import AsyncAnthropic
            client = AsyncAnthropic(api_key=settings.anthropic_api_key)
            
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
            
            response = await client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=8000,
                system=system_prompt,
                messages=[{"role": "user", "content": f"Build this app: {prompt}"}],
            )
            
            text_response = response.content[0].text.strip()
            print(f"   Claude response length: {len(text_response)}")
            
            # Clean the response - remove markdown code blocks
            cleaned = text_response
            if cleaned.startswith("```"):
                # Remove opening ```json or ```
                first_newline = cleaned.find("\n")
                if first_newline > 0:
                    cleaned = cleaned[first_newline + 1:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            cleaned = cleaned.strip()
            
            # Parse JSON
            result = None
            try:
                result = json.loads(cleaned)
                print(f"   JSON parse succeeded")
            except json.JSONDecodeError as e:
                print(f"   JSON parse failed: {e}")
                # Try finding JSON object boundaries
                try:
                    start = cleaned.find("{")
                    # Find matching closing brace by counting
                    depth = 0
                    end = -1
                    for i, c in enumerate(cleaned[start:], start):
                        if c == "{":
                            depth += 1
                        elif c == "}":
                            depth -= 1
                            if depth == 0:
                                end = i + 1
                                break
                    if end > start:
                        result = json.loads(cleaned[start:end])
                        print(f"   Bracket matching succeeded")
                except:
                    pass
            
            # Final fallback - generate simple HTML
            if not result or "files" not in result:
                print(f"   All parsing failed, generating simple fallback")
                result = {
                    "name": prompt[:30].title(),
                    "description": prompt,
                    "entry_point": "index.html",
                    "files": {
                        "index.html": f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{prompt[:30].title()}</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{ font-family: system-ui, sans-serif; background: #0a0a0a; color: #fff; min-height: 100vh; display: flex; align-items: center; justify-content: center; }}
        .container {{ text-align: center; padding: 2rem; }}
        h1 {{ font-size: 2.5rem; margin-bottom: 1rem; background: linear-gradient(135deg, #f97316, #eab308); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }}
        p {{ color: #888; font-size: 1.1rem; }}
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 Build in Progress</h1>
        <p>Your app "{prompt[:50]}" is being created...</p>
    </div>
</body>
</html>'''
                    },
                }
            
            print(f"   Parsed result - Name: {result.get('name')}, Files: {list(result.get('files', {}).keys())}")
            
            # Update project
            await db.execute(
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
                    "name": result.get("name", "Untitled"),
                    "description": result.get("description", prompt[:100]),
                    "files": json.dumps(result["files"]),
                    "entry_point": result.get("entry_point", "index.html"),
                }
            )
            await db.commit()
        
        # Update mention state
        mention["status"] = "deployed"
        mention["deployment_url"] = f"https://heyclaude.app/p/{slug}"
        
        # Reply with success - friendly message
        reply_id = await reply_to_tweet(
            tweet_id,
            f"✅ Your app \"{result.get('name', 'Your App')}\" is ready!\n\n"
            f"🌐 Live: https://heyclaude.app/p/{slug}\n"
            f"🛠️ Edit it: https://heyclaude.app/studio/{slug}\n\n"
            f"Reply anytime to make changes! 🚀"
        )
        
        if reply_id:
            mention["status"] = "replied"
            mention["reply_id"] = reply_id
        
        # Mark as processed
        _twitter_state["processed_ids"].add(tweet_id)
        
        # Remove from queue
        _twitter_state["queue"] = [q for q in _twitter_state["queue"] if q["tweet_id"] != tweet_id]
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        mention["status"] = "failed"
        mention["error"] = str(e)
        _twitter_state["queue"] = [q for q in _twitter_state["queue"] if q["tweet_id"] != tweet_id]


@router.get("/mentions")
async def get_mentions():
    """Get all mentions and their status."""
    mentions = await fetch_twitter_mentions()
    
    return {
        "mentions": mentions,
        "queue": _twitter_state["queue"],
        "stats": {
            "total_mentions": len(mentions),
            "pending": sum(1 for m in mentions if m["status"] == "pending"),
            "processing": sum(1 for m in mentions if m["status"] in ["processing", "building"]),
            "deployed": sum(1 for m in mentions if m["status"] in ["deployed", "replied"]),
            "failed": sum(1 for m in mentions if m["status"] == "failed"),
            "rate_limit_remaining": _twitter_state["rate_limit_remaining"],
            "rate_limit_reset": _twitter_state["rate_limit_reset"],
        }
    }


@router.get("/debug/twitter")
async def debug_twitter_credentials():
    """Debug endpoint to check Twitter credential status."""
    return {
        "bearer_token": "SET" if settings.twitter_bearer_token else "MISSING",
        "api_key": "SET" if settings.twitter_api_key else "MISSING", 
        "api_secret": "SET" if settings.twitter_api_secret else "MISSING",
        "access_token": "SET" if settings.twitter_access_token else "MISSING",
        "access_secret": "SET" if settings.twitter_access_secret else "MISSING",
        "bot_username": settings.twitter_bot_username,
        "bot_user_id": settings.twitter_bot_user_id or "NOT SET",
    }


@router.post("/rebuild/{slug}")
async def rebuild_project(
    slug: str,
    background_tasks: BackgroundTasks,
):
    """Re-generate a project by slug."""
    import asyncio
    
    async with async_session() as db:
        # Get the project
        result = await db.execute(
            text("SELECT id, original_prompt, source_tweet_id FROM projects WHERE slug = :slug"),
            {"slug": slug}
        )
        row = result.fetchone()
        
        if not row:
            raise HTTPException(status_code=404, detail="Project not found")
        
        project_id, prompt, tweet_id = row
        
        # Reset status
        await db.execute(
            text("UPDATE projects SET deployment_status = 'building' WHERE slug = :slug"),
            {"slug": slug}
        )
        await db.commit()
    
    # Run regeneration using background_tasks (FastAPI handles this better)
    async def do_rebuild():
        try:
            print(f"🔄 Starting rebuild for {slug} with prompt: {prompt[:50]}...")
            await regenerate_project(slug, prompt)
            print(f"✅ Rebuild completed for {slug}")
        except Exception as e:
            import traceback
            print(f"❌ Rebuild failed for {slug}: {str(e)}")
            print(f"   Traceback: {traceback.format_exc()}")
            # Mark as failed in DB
            try:
                async with async_session() as db:
                    await db.execute(
                        text("UPDATE projects SET deployment_status = 'failed' WHERE slug = :slug"),
                        {"slug": slug}
                    )
                    await db.commit()
            except Exception as db_err:
                print(f"   DB error: {str(db_err)}")
    
    background_tasks.add_task(do_rebuild)
    
    return {"status": "rebuilding", "slug": slug, "prompt": prompt}


async def regenerate_project(slug: str, prompt: str):
    """Regenerate a project with the given prompt."""
    from anthropic import AsyncAnthropic
    
    print(f"🚀 regenerate_project called for {slug}")
    print(f"   Anthropic API key set: {bool(settings.anthropic_api_key)}")
    
    if not settings.anthropic_api_key:
        print("❌ No Anthropic API key!")
        return
    
    try:
        client = AsyncAnthropic(api_key=settings.anthropic_api_key)
        
        system_prompt = """You are HeyClaude, an expert developer. Generate a complete web app.
Dark mode (#0a0a0a background), modern design, responsive.
Respond with ONLY valid JSON (no markdown): {"name": "...", "description": "...", "entry_point": "index.html", "files": {"index.html": "<!DOCTYPE html>..."}}"""
        
        print(f"   Calling Claude API...")
        response = await client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=8000,
            system=system_prompt,
            messages=[{"role": "user", "content": f"Build: {prompt}"}],
        )
        
        text_response = response.content[0].text.strip()
        print(f"   Claude response length: {len(text_response)}")
    except Exception as e:
        print(f"❌ Claude API error: {str(e)}")
        return
    
    # Clean markdown code blocks
    cleaned = text_response
    if cleaned.startswith("```"):
        first_newline = cleaned.find("\n")
        if first_newline > 0:
            cleaned = cleaned[first_newline + 1:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    cleaned = cleaned.strip()
    
    # Parse JSON
    result = None
    try:
        result = json.loads(cleaned)
        print(f"   JSON parse succeeded")
    except json.JSONDecodeError:
        # Try finding JSON by matching braces
        try:
            start = cleaned.find("{")
            depth = 0
            end = -1
            for i, c in enumerate(cleaned[start:], start):
                if c == "{":
                    depth += 1
                elif c == "}":
                    depth -= 1
                    if depth == 0:
                        end = i + 1
                        break
            if end > start:
                result = json.loads(cleaned[start:end])
                print(f"   Bracket matching succeeded")
        except:
            pass
    
    # Fallback with styled HTML
    if not result or "files" not in result:
        print(f"   Parsing failed, using styled fallback")
        result = {
            "name": prompt[:30].title(),
            "description": prompt,
            "entry_point": "index.html",
            "files": {
                "index.html": f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{prompt[:30].title()}</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{ font-family: system-ui, sans-serif; background: #0a0a0a; color: #fff; min-height: 100vh; display: flex; align-items: center; justify-content: center; }}
        .container {{ text-align: center; padding: 2rem; }}
        h1 {{ font-size: 2.5rem; margin-bottom: 1rem; background: linear-gradient(135deg, #f97316, #eab308); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }}
        p {{ color: #888; font-size: 1.1rem; }}
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 Build in Progress</h1>
        <p>Your app "{prompt[:50]}" is being created...</p>
    </div>
</body>
</html>'''
            },
        }
    
    files = result.get("files", {})
    entry_file = files.get(result.get("entry_point", "index.html"), "")
    if entry_file.strip().startswith("{") and '"files"' in entry_file:
        print(f"   WARNING: Entry file contains JSON, attempting to fix...")
        try:
            nested = json.loads(entry_file)
            if "files" in nested:
                result["files"] = nested["files"]
                result["name"] = nested.get("name", result.get("name"))
                result["description"] = nested.get("description", result.get("description"))
                print(f"   Fixed nested JSON structure")
        except:
            pass
    
    # Update project in database
    print(f"   Updating database for {slug}...")
    print(f"   Name: {result.get('name')}")
    print(f"   Files: {list(result.get('files', {}).keys())}")
    
    try:
        async with async_session() as db:
            await db.execute(
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
                "name": result.get("name", "Untitled"),
                "description": result.get("description", prompt[:100]),
                "files": json.dumps(result["files"]),
                "entry_point": result.get("entry_point", "index.html"),
            }
            )
            await db.commit()
        print(f"✅ Project {slug} regenerated - {result.get('name')}")
    except Exception as e:
        print(f"❌ Database update error for {slug}: {str(e)}")


@router.post("/rebuild-sync/{slug}")
async def rebuild_project_sync(slug: str):
    """Re-generate a project synchronously (for debugging)."""
    from anthropic import AsyncAnthropic
    import re
    
    async with async_session() as db:
        result_row = await db.execute(
            text("SELECT id, original_prompt, source_tweet_id FROM projects WHERE slug = :slug"),
            {"slug": slug}
        )
        row = result_row.fetchone()
        
        if not row:
            raise HTTPException(status_code=404, detail="Project not found")
        
        project_id, prompt, tweet_id = row
        
        # Generate with Claude
        client = AsyncAnthropic(api_key=settings.anthropic_api_key)
        
        system_prompt = """You are HeyClaude, an expert developer. Generate a complete web app.
Dark mode, modern design. Respond with ONLY valid JSON (no markdown):
{"name": "App Name", "description": "...", "entry_point": "index.html", "files": {"index.html": "<!DOCTYPE html>..."}}"""
        
        response = await client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=8000,
            system=system_prompt,
            messages=[{"role": "user", "content": f"Build: {prompt}"}],
        )
        
        text_response = response.content[0].text.strip()
        debug_info = {"raw_length": len(text_response), "starts_with": text_response[:100]}
        
        # Parse JSON
        result = None
        
        # Method 1: Direct parse
        try:
            result = json.loads(text_response)
            debug_info["parse_method"] = "direct"
        except json.JSONDecodeError as e:
            debug_info["direct_error"] = str(e)
        
        # Method 2: Regex extraction from markdown
        if not result and "```" in text_response:
            try:
                pattern = r'```(?:json)?\s*([\s\S]*?)```'
                matches = re.findall(pattern, text_response)
                for match in matches:
                    match = match.strip()
                    if match.startswith("{"):
                        result = json.loads(match)
                        debug_info["parse_method"] = "regex"
                        break
            except json.JSONDecodeError as e:
                debug_info["regex_error"] = str(e)
        
        # Method 3: Bracket extraction
        if not result:
            try:
                start = text_response.find("{")
                end = text_response.rfind("}") + 1
                if start >= 0 and end > start:
                    result = json.loads(text_response[start:end])
                    debug_info["parse_method"] = "bracket"
            except json.JSONDecodeError as e:
                debug_info["bracket_error"] = str(e)
        
        if not result or "files" not in result:
            return {"status": "parse_failed", "debug": debug_info, "raw_response": text_response[:500]}
        
        # Validate that files contain actual HTML, not JSON
        files = result.get("files", {})
        entry_file = files.get(result.get("entry_point", "index.html"), "")
        if entry_file.strip().startswith("{") and '"files"' in entry_file:
            debug_info["nested_json_detected"] = True
            try:
                nested = json.loads(entry_file)
                if "files" in nested:
                    result["files"] = nested["files"]
                    result["name"] = nested.get("name", result.get("name"))
                    result["description"] = nested.get("description", result.get("description"))
                    debug_info["nested_json_fixed"] = True
            except:
                pass
        
        # Update DB
        await db.execute(
            text("""
                UPDATE projects 
                SET name = :name, description = :description, files = :files,
                    entry_point = :entry_point, deployment_status = 'deployed'
                WHERE slug = :slug
            """),
            {
                "slug": slug,
                "name": result.get("name", "Untitled"),
                "description": result.get("description", ""),
                "files": json.dumps(result["files"]),
                "entry_point": result.get("entry_point", "index.html"),
            }
        )
        await db.commit()
        
        return {
            "status": "success",
            "name": result.get("name"),
            "files": list(result.get("files", {}).keys()),
            "debug": debug_info
        }


@router.post("/fix-project/{slug}")
async def fix_project(slug: str):
    """Try to fix a project with broken JSON in files."""
    import re
    
    async with async_session() as db:
        result = await db.execute(
            text("SELECT files FROM projects WHERE slug = :slug"),
            {"slug": slug}
        )
        row = result.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Project not found")
        
        files_raw = row[0]
        if isinstance(files_raw, str):
            files = json.loads(files_raw)
        else:
            files = files_raw
        
        debug = {"original_files": list(files.keys())}
        
        # Check if entry file contains JSON or error HTML wrapping JSON
        entry_content = files.get("index.html", "")
        
        # Check for error wrapper pattern
        is_error_wrapped = "<h1>Build Error</h1>" in entry_content or "<h1>Error parsing" in entry_content
        
        if entry_content.strip().startswith("{") or entry_content.strip().startswith("```") or is_error_wrapped:
            debug["needs_fixing"] = True
            debug["is_error_wrapped"] = is_error_wrapped
            
            # Try to parse the nested JSON
            text_to_parse = entry_content
            
            # Extract from <pre> tag if error wrapped
            if is_error_wrapped and "<pre>" in text_to_parse:
                pre_start = text_to_parse.find("<pre>") + 5
                pre_end = text_to_parse.find("</pre>") if "</pre>" in text_to_parse else len(text_to_parse)
                text_to_parse = text_to_parse[pre_start:pre_end]
                debug["extracted_from_pre"] = True
            
            # Strip markdown opening (closing may be truncated)
            if text_to_parse.startswith("```json"):
                text_to_parse = text_to_parse[7:].strip()
            elif text_to_parse.startswith("```"):
                text_to_parse = text_to_parse[3:].strip()
            
            # Remove closing ``` if present
            if text_to_parse.endswith("```"):
                text_to_parse = text_to_parse[:-3].strip()
            
            # Find JSON boundaries
            start = text_to_parse.find("{")
            end = text_to_parse.rfind("}") + 1
            debug["json_range"] = f"{start}:{end}"
            if start >= 0 and end > start:
                text_to_parse = text_to_parse[start:end]
            
            try:
                parsed = json.loads(text_to_parse)
                if "files" in parsed:
                    new_files = parsed["files"]
                    new_name = parsed.get("name", "Fixed App")
                    new_desc = parsed.get("description", "")
                    
                    await db.execute(
                        text("""
                            UPDATE projects 
                            SET files = :files, name = :name, description = :description
                            WHERE slug = :slug
                        """),
                        {"slug": slug, "files": json.dumps(new_files), "name": new_name, "description": new_desc}
                    )
                    await db.commit()
                    
                    return {"status": "fixed", "name": new_name, "files": list(new_files.keys()), "debug": debug}
            except json.JSONDecodeError as e:
                debug["parse_error"] = str(e)
                return {"status": "parse_failed", "debug": debug}
        
        return {"status": "no_fix_needed", "debug": debug}


@router.post("/debug/test-parse")
async def test_parse(text: str):
    """Test JSON parsing logic."""
    import re
    
    result = None
    debug = {"input_length": len(text), "starts_with": text[:50]}
    
    # Method 1: Direct parse
    try:
        result = json.loads(text)
        debug["method"] = "direct"
    except json.JSONDecodeError as e:
        debug["direct_error"] = str(e)
    
    # Method 2: Regex
    if not result and "```" in text:
        try:
            pattern = r'```(?:json)?\s*([\s\S]*?)```'
            matches = re.findall(pattern, text)
            debug["regex_matches"] = len(matches)
            for match in matches:
                match = match.strip()
                if match.startswith("{"):
                    result = json.loads(match)
                    debug["method"] = "regex"
                    break
        except json.JSONDecodeError as e:
            debug["regex_error"] = str(e)
    
    # Method 3: Bracket
    if not result:
        try:
            start = text.find("{")
            end = text.rfind("}") + 1
            debug["bracket_range"] = f"{start}:{end}"
            if start >= 0 and end > start:
                result = json.loads(text[start:end])
                debug["method"] = "bracket"
        except json.JSONDecodeError as e:
            debug["bracket_error"] = str(e)
    
    if result and "files" in result:
        # Check for nested JSON
        entry = result.get("files", {}).get(result.get("entry_point", "index.html"), "")
        if entry.strip().startswith("{"):
            debug["nested_json_in_entry"] = True
        return {"status": "success", "name": result.get("name"), "files": list(result.get("files", {}).keys()), "debug": debug}
    
    return {"status": "failed", "debug": debug}


@router.get("/debug/claude")
async def test_claude_api():
    """Test Claude API connection and generate a simple app."""
    from anthropic import AsyncAnthropic
    
    if not settings.anthropic_api_key:
        return {"status": "error", "message": "ANTHROPIC_API_KEY not set in environment"}
    
    try:
        client = AsyncAnthropic(api_key=settings.anthropic_api_key)
        
        response = await client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=4000,
            system="You are a web developer. Respond with ONLY valid JSON, no markdown.",
            messages=[{"role": "user", "content": "Create a simple hello world page. Return JSON: {\"name\": \"...\", \"files\": {\"index.html\": \"...\"}}"}]
        )
        
        text_response = response.content[0].text.strip()
        
        # Try to parse
        try:
            result = json.loads(text_response)
            return {
                "status": "success",
                "api_key_set": True,
                "model": "claude-sonnet-4-20250514",
                "response_length": len(text_response),
                "parsed": True,
                "name": result.get("name"),
                "files": list(result.get("files", {}).keys()),
            }
        except json.JSONDecodeError as e:
            return {
                "status": "parse_error",
                "api_key_set": True,
                "response_length": len(text_response),
                "raw_preview": text_response[:500],
                "error": str(e)
            }
    except Exception as e:
        return {
            "status": "api_error",
            "api_key_set": bool(settings.anthropic_api_key),
            "error": str(e)
        }


@router.post("/debug/test-reply")
async def test_twitter_reply(tweet_id: str = "2011430961410638276"):
    """Test Twitter reply and return the actual API response."""
    url = "https://api.twitter.com/2/tweets"
    
    auth_header = await twitter_oauth_header("POST", url)
    
    payload = {
        "text": "🧪 Test reply from HeyClaude",
        "reply": {"in_reply_to_tweet_id": tweet_id}
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            url,
            headers={
                "Authorization": auth_header,
                "Content-Type": "application/json",
            },
            json=payload
        )
        
        return {
            "status_code": response.status_code,
            "response": response.json() if response.headers.get("content-type", "").startswith("application/json") else response.text,
            "auth_header_preview": auth_header[:100] + "..."
        }


@router.post("/generate")
async def generate_app(prompt: str):
    """Generate an app using Claude API and return immediately (no database storage)."""
    from anthropic import AsyncAnthropic
    
    if not settings.anthropic_api_key:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY not configured")
    
    client = AsyncAnthropic(api_key=settings.anthropic_api_key)
    
    system_prompt = """You are HeyClaude, an expert web developer that generates complete web applications.
Generate COMPLETE, WORKING code with:
- Dark mode by default (dark background #0a0a0a, light text)
- Modern, beautiful design with CSS
- Mobile responsive
- Real content (not lorem ipsum)
- Interactive elements where appropriate

Respond with ONLY a JSON object (no markdown, no code blocks):
{
    "name": "App Name",
    "description": "One sentence description",
    "entry_point": "index.html",
    "files": {
        "index.html": "<!DOCTYPE html>..."
    }
}"""
    
    response = await client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=8000,
        system=system_prompt,
        messages=[{"role": "user", "content": f"Build this app: {prompt}"}]
    )
    
    text_response = response.content[0].text.strip()
    
    # Clean markdown if present
    if text_response.startswith("```"):
        first_newline = text_response.find("\n")
        if first_newline > 0:
            text_response = text_response[first_newline + 1:]
    if text_response.endswith("```"):
        text_response = text_response[:-3]
    text_response = text_response.strip()
    
    # Parse JSON
    try:
        result = json.loads(text_response)
    except json.JSONDecodeError:
        # Try bracket matching
        start = text_response.find("{")
        if start >= 0:
            depth = 0
            end = -1
            for i, c in enumerate(text_response[start:], start):
                if c == "{": depth += 1
                elif c == "}":
                    depth -= 1
                    if depth == 0:
                        end = i + 1
                        break
            if end > start:
                try:
                    result = json.loads(text_response[start:end])
                except:
                    raise HTTPException(status_code=500, detail="Failed to parse Claude response")
            else:
                raise HTTPException(status_code=500, detail="Failed to parse Claude response")
        else:
            raise HTTPException(status_code=500, detail="Failed to parse Claude response")
    
    return {
        "status": "success",
        "name": result.get("name"),
        "description": result.get("description"),
        "entry_point": result.get("entry_point", "index.html"),
        "files": result.get("files", {}),
    }


@router.post("/quick-build/{slug}")
async def quick_build(slug: str):
    """Quickly rebuild a project using Claude - minimal parsing, direct save."""
    from anthropic import AsyncAnthropic
    
    if not settings.anthropic_api_key:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY not configured")
    
    async with async_session() as db:
        result = await db.execute(
            text("SELECT original_prompt FROM projects WHERE slug = :slug"),
            {"slug": slug}
        )
        row = result.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Project not found")
        
        prompt = row[0]
    
    client = AsyncAnthropic(api_key=settings.anthropic_api_key)
    
    response = await client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=8000,
        system="""You are HeyClaude. Generate a complete web app with dark mode, modern design, and real content.
Return ONLY valid JSON (no markdown): {"name": "...", "description": "...", "entry_point": "index.html", "files": {"index.html": "<!DOCTYPE html>..."}}""",
        messages=[{"role": "user", "content": f"Build: {prompt}"}]
    )
    
    text_response = response.content[0].text.strip()
    
    # Simple cleanup
    if text_response.startswith("```"):
        text_response = text_response.split("\n", 1)[1] if "\n" in text_response else text_response[3:]
    if text_response.endswith("```"):
        text_response = text_response[:-3]
    text_response = text_response.strip()
    
    # Parse JSON
    try:
        result = json.loads(text_response)
    except:
        start = text_response.find("{")
        end = text_response.rfind("}") + 1
        if start >= 0 and end > start:
            result = json.loads(text_response[start:end])
        else:
            raise HTTPException(status_code=500, detail="Failed to parse Claude response")
    
    # Save to database
    async with async_session() as db:
        await db.execute(
            text("""
                UPDATE projects SET 
                    name = :name, description = :description, 
                    files = :files, entry_point = :entry_point,
                    deployment_status = 'deployed'
                WHERE slug = :slug
            """),
            {
                "slug": slug,
                "name": result.get("name", prompt[:30]),
                "description": result.get("description", ""),
                "files": json.dumps(result.get("files", {})),
                "entry_point": result.get("entry_point", "index.html"),
            }
        )
        await db.commit()
    
    return {
        "status": "success",
        "slug": slug,
        "name": result.get("name"),
        "files": list(result.get("files", {}).keys()),
    }


@router.post("/deploy")
async def trigger_deploy(
    request: DeployRequest,
    background_tasks: BackgroundTasks,
):
    """Manually trigger deployment for a tweet."""
    tweet_id = request.tweet_id
    
    if tweet_id not in _twitter_state["mentions"]:
        raise HTTPException(status_code=404, detail="Tweet not found")
    
    mention = _twitter_state["mentions"][tweet_id]
    
    if mention["status"] not in ["pending", "failed"]:
        raise HTTPException(status_code=400, detail=f"Cannot deploy tweet with status: {mention['status']}")
    
    mention["status"] = "processing"
    
    # Process in background
    background_tasks.add_task(process_deployment, tweet_id)
    
    return {
        "status": "queued",
        "tweet_id": tweet_id,
        "project_slug": mention.get("project_slug"),
    }


@router.post("/reply")
async def force_reply(request: ReplyRequest):
    """Force a reply to a tweet."""
    tweet_id = request.tweet_id
    
    # First check in-memory state
    mention = _twitter_state["mentions"].get(tweet_id)
    deployment_url = mention.get("deployment_url") if mention else None
    project_name = "Your App"
    slug = mention.get("project_slug") if mention else None
    
    # If we have a slug from memory, build the URL
    if slug and not deployment_url:
        async with async_session() as db:
            result = await db.execute(
                text("SELECT name, deployment_status FROM projects WHERE slug = :slug"),
                {"slug": slug}
            )
            row = result.fetchone()
            if row and row[1] == "deployed":
                deployment_url = f"https://heyclaude.app/p/{slug}"
                project_name = row[0] or "Your App"
    
    # If still no URL, try to find by tweet_id in database
    if not deployment_url:
        async with async_session() as db:
            result = await db.execute(
                text("""
                    SELECT slug, name, deployment_status 
                    FROM projects 
                    WHERE source_tweet_id = :tweet_id
                    ORDER BY created_at DESC
                    LIMIT 1
                """),
                {"tweet_id": tweet_id}
            )
            row = result.fetchone()
            
            if row:
                slug, name, status = row
                if status == "deployed":
                    deployment_url = f"https://heyclaude.app/p/{slug}"
                    project_name = name or "Your App"
    
    if not deployment_url:
        raise HTTPException(
            status_code=400, 
            detail=f"No deployment URL available. Slug in memory: {slug}"
        )
    
    # Update in-memory state
    if mention:
        mention["deployment_url"] = deployment_url
        mention["status"] = "deployed"
    
    message = request.custom_message or (
        f"✅ Your app \"{project_name}\" is ready!\n\n"
        f"🌐 Live: {deployment_url}\n"
        f"🛠️ Edit it: {deployment_url.replace('/p/', '/studio/')}\n\n"
        f"Reply anytime to make changes! 🚀"
    )
    
    reply_id = await reply_to_tweet(tweet_id, message)
    
    if reply_id:
        if mention:
            mention["status"] = "replied"
            mention["reply_id"] = reply_id
        _twitter_state["processed_ids"].add(tweet_id)
        return {"status": "replied", "reply_id": reply_id, "url": deployment_url}
    else:
        # Return more debug info
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to post reply. Check Railway logs for Twitter API error."
        )

