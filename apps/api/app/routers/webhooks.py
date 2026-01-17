"""
Webhook handlers for external services.
"""

import hmac
import hashlib
import json
import re
from datetime import datetime, timedelta
from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, Request, HTTPException, Header, BackgroundTasks
from slugify import slugify
import httpx

from app.config import settings
from app.database import get_db
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/webhooks", tags=["webhooks"])


# ─────────────────────────────────────────────────────────────
# Notifier.so Webhook (Third-party mention tracking)
# ─────────────────────────────────────────────────────────────

def generate_slug(text: str) -> str:
    """Generate a URL-friendly slug."""
    import random
    import string
    
    words = text.lower().split()
    stop_words = {"a", "an", "the", "make", "me", "create", "build", "with", "and", "or", "for"}
    meaningful = [w for w in words if w not in stop_words][:4] or words[:2] or ["project"]
    
    base = slugify(" ".join(meaningful), max_length=42)
    suffix = "".join(random.choices(string.ascii_lowercase + string.digits, k=4))
    
    return f"{base}-{suffix}" if base else f"project-{suffix}"


async def process_mention_build(
    tweet_id: str,
    author_id: str,
    author_username: str,
    prompt: str,
    db: AsyncSession,
):
    """Process a mention and build the app."""
    from anthropic import AsyncAnthropic
    
    print(f"🔨 Processing build for @{author_username}: {prompt[:50]}...")
    
    slug = generate_slug(prompt)
    
    try:
        # Reply "building" immediately
        await reply_to_tweet(
            tweet_id,
            f"🔨 Building your app, @{author_username}!\n\n"
            f"Watch it live: https://heyclaude.xyz/build/{slug}\n\n"
            f"⏱️ Usually takes 30-60 seconds"
        )
        
        # Upsert user - insert if not exists, otherwise get existing
        user_id = uuid4()
        await db.execute(
            text("""
                INSERT INTO users (id, x_user_id, x_username, tier, credits, created_at)
                VALUES (:id, :x_user_id, :x_username, 'free', 10, NOW())
                ON CONFLICT (x_user_id) DO NOTHING
            """),
            {"id": user_id, "x_user_id": author_id, "x_username": author_username}
        )
        
        # Get the actual user ID (whether just inserted or already existed)
        user_result = await db.execute(
            text("SELECT id FROM users WHERE x_user_id = :x_user_id"),
            {"x_user_id": author_id}
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
        client = AsyncAnthropic(api_key=settings.anthropic_api_key)
        
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
        
        response = await client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=8000,
            system=system_prompt,
            messages=[{"role": "user", "content": f"Build this app: {prompt}"}],
        )
        
        text_response = response.content[0].text.strip()
        
        try:
            if text_response.startswith("```"):
                text_response = text_response.split("```")[1]
                if text_response.startswith("json"):
                    text_response = text_response[4:]
            result = json.loads(text_response)
        except:
            result = {
                "name": "Generated App",
                "description": prompt[:100],
                "entry_point": "index.html",
                "files": {"index.html": text_response},
            }
        
        # Update project with generated files
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
        
        # Reply with success
        project_url = f"https://buildonx.app/p/{slug}"
        studio_url = f"https://buildonx.app/studio/{slug}"
        
        await reply_to_tweet(
            tweet_id,
            f"✅ Done! Your app \"{result.get('name', 'Your App')}\" is live:\n\n"
            f"🌐 {project_url}\n"
            f"🛠️ Edit: {studio_url}\n\n"
            f"Reply to refine your project!"
        )
        
        print(f"✅ Build complete: {project_url}")
        
    except Exception as e:
        print(f"❌ Build failed: {e}")
        import traceback
        traceback.print_exc()
        
        await reply_to_tweet(
            tweet_id,
            f"❌ Build failed, @{author_username}\n\n"
            f"Error: {str(e)[:80]}\n\n"
            f"Try simplifying your request!"
        )


async def reply_to_tweet(tweet_id: str, text: str):
    """Reply to a tweet using OAuth 1.0a."""
    import time
    import urllib.parse
    import base64
    
    url = "https://api.twitter.com/2/tweets"
    
    # OAuth 1.0a parameters
    oauth_params = {
        "oauth_consumer_key": settings.twitter_api_key,
        "oauth_nonce": uuid4().hex,
        "oauth_signature_method": "HMAC-SHA1",
        "oauth_timestamp": str(int(time.time())),
        "oauth_token": settings.twitter_access_token,
        "oauth_version": "1.0",
    }
    
    # Create signature
    sorted_params = sorted(oauth_params.items())
    param_string = "&".join(f"{k}={urllib.parse.quote(str(v), safe='')}" for k, v in sorted_params)
    
    base_string = "&".join([
        "POST",
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
    auth_header = "OAuth " + ", ".join(header_parts)
    
    payload = {
        "text": text,
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
        
        if response.status_code in [200, 201]:
            print(f"✅ Replied to {tweet_id}")
        else:
            print(f"❌ Reply failed ({response.status_code}): {response.text}")


@router.post("/notifier")
async def notifier_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
):
    """
    Handle incoming webhooks from Notifier.so for Twitter mentions.
    This eliminates the need for polling!
    """
    from app.database import async_session
    
    data = await request.json()
    print(f"📥 Notifier webhook received: {json.dumps(data, indent=2)[:500]}")
    
    # Notifier.so sends mentions in different formats depending on setup
    # Handle common formats:
    
    tweet_id = data.get("tweet_id") or data.get("id") or data.get("data", {}).get("id")
    author_username = (
        data.get("author_username") or 
        data.get("username") or 
        data.get("user", {}).get("username") or
        data.get("data", {}).get("author_username")
    )
    author_id = (
        data.get("author_id") or 
        data.get("user_id") or 
        data.get("user", {}).get("id") or
        data.get("data", {}).get("author_id")
    )
    text_content = (
        data.get("text") or 
        data.get("content") or 
        data.get("tweet_text") or
        data.get("data", {}).get("text") or
        ""
    )
    
    if not tweet_id or not text_content:
        print("⚠️ Missing required fields in webhook")
        return {"status": "ignored", "reason": "missing fields"}
    
    # Extract prompt (remove @mention)
    prompt = re.sub(r"@\w+", "", text_content).strip()
    
    if not prompt:
        return {"status": "ignored", "reason": "empty prompt"}
    
    # Skip if it's from our own bot
    if author_username and author_username.lower() == "buildappsonx":
        return {"status": "ignored", "reason": "own tweet"}
    
    # Process in background so webhook returns quickly
    async def do_build():
        async with async_session() as db:
            await process_mention_build(
                tweet_id=str(tweet_id),
                author_id=str(author_id or "unknown"),
                author_username=author_username or "user",
                prompt=prompt,
                db=db,
            )
    
    background_tasks.add_task(do_build)
    
    return {"status": "queued", "tweet_id": tweet_id}


# ─────────────────────────────────────────────────────────────
# Twitter/X Webhooks (Account Activity API)
# ─────────────────────────────────────────────────────────────

@router.get("/twitter")
async def twitter_crc_check(
    crc_token: str,
):
    """
    Handle Twitter CRC (Challenge Response Check) for webhook verification.
    Twitter sends this to verify our webhook endpoint.
    """
    # Create HMAC SHA256 hash
    hmac_digest = hmac.new(
        settings.twitter_api_secret.encode(),
        msg=crc_token.encode(),
        digestmod=hashlib.sha256,
    ).digest()
    
    import base64
    response_token = base64.b64encode(hmac_digest).decode()
    
    return {"response_token": f"sha256={response_token}"}


@router.post("/twitter")
async def twitter_webhook(
    request: Request,
    x_twitter_webhooks_signature: Optional[str] = Header(None),
):
    """
    Handle incoming Twitter webhook events.
    This is an alternative to the filtered stream approach.
    """
    body = await request.body()
    
    # Verify signature if provided
    if x_twitter_webhooks_signature:
        expected = hmac.new(
            settings.twitter_api_secret.encode(),
            msg=body,
            digestmod=hashlib.sha256,
        ).digest()
        
        import base64
        expected_b64 = base64.b64encode(expected).decode()
        
        if not hmac.compare_digest(
            f"sha256={expected_b64}",
            x_twitter_webhooks_signature,
        ):
            raise HTTPException(status_code=401, detail="Invalid signature")
    
    data = await request.json()
    
    # Handle different event types
    if "tweet_create_events" in data:
        # New tweets/mentions
        for tweet in data["tweet_create_events"]:
            # Queue for processing
            # In production, you'd send this to a message queue
            pass
    
    if "direct_message_events" in data:
        # DMs (if you want to support building via DM)
        pass
    
    return {"status": "received"}


# ─────────────────────────────────────────────────────────────
# Fly.io Webhooks
# ─────────────────────────────────────────────────────────────

@router.post("/fly")
async def fly_webhook(
    request: Request,
):
    """
    Handle Fly.io deployment status webhooks.
    """
    data = await request.json()
    
    event_type = data.get("type")
    app_name = data.get("app", {}).get("name")
    
    if event_type == "machine.started":
        # Deployment is live
        pass
    elif event_type == "machine.stopped":
        # Machine stopped
        pass
    elif event_type == "machine.destroyed":
        # Machine was destroyed
        pass
    
    return {"status": "received", "event": event_type}


# ─────────────────────────────────────────────────────────────
# Stripe Webhooks (for Pro subscriptions)
# ─────────────────────────────────────────────────────────────

@router.post("/stripe")
async def stripe_webhook(
    request: Request,
    stripe_signature: Optional[str] = Header(None, alias="Stripe-Signature"),
):
    """
    Handle Stripe payment webhooks.
    """
    body = await request.body()
    
    # In production, verify with stripe.Webhook.construct_event()
    # For now, just parse the JSON
    data = await request.json()
    
    event_type = data.get("type")
    
    if event_type == "checkout.session.completed":
        # User completed checkout - upgrade to Pro
        session = data.get("data", {}).get("object", {})
        customer_id = session.get("customer")
        # Update user tier based on customer_id
        pass
    
    elif event_type == "customer.subscription.deleted":
        # Subscription cancelled - downgrade to Free
        subscription = data.get("data", {}).get("object", {})
        customer_id = subscription.get("customer")
        # Update user tier
        pass
    
    elif event_type == "invoice.payment_failed":
        # Payment failed - notify user
        pass
    
    return {"status": "received", "event": event_type}

