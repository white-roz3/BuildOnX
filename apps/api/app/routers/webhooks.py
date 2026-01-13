"""
Webhook handlers for external services.
"""

import hmac
import hashlib
from typing import Optional

from fastapi import APIRouter, Request, HTTPException, Header

from app.config import settings

router = APIRouter(prefix="/webhooks", tags=["webhooks"])


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

