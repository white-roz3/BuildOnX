"""
Twitter/X API service for handling mentions, replies, and streaming.
"""

import asyncio
import hashlib
import hmac
import time
import json
import base64
import urllib.parse
from typing import Optional, AsyncGenerator
from datetime import datetime

import httpx

from app.config import settings


class TwitterService:
    """Handles all X/Twitter API interactions."""
    
    BASE_URL = "https://api.twitter.com/2"
    
    def __init__(self):
        self.bearer_token = settings.twitter_bearer_token
        self.api_key = settings.twitter_api_key
        self.api_secret = settings.twitter_api_secret
        self.access_token = settings.twitter_access_token
        self.access_secret = settings.twitter_access_secret
        self.bot_user_id = settings.twitter_bot_user_id
        self.bot_username = settings.twitter_bot_username
    
    @property
    def bearer_headers(self) -> dict:
        """Headers for app-only authentication."""
        return {
            "Authorization": f"Bearer {self.bearer_token}",
            "Content-Type": "application/json",
        }
    
    # ─────────────────────────────────────────────────────────────
    # OAUTH 1.0A SIGNING
    # ─────────────────────────────────────────────────────────────
    
    def _generate_oauth_signature(
        self,
        method: str,
        url: str,
        params: dict,
    ) -> str:
        """Generate OAuth 1.0a signature."""
        # Create parameter string
        sorted_params = sorted(params.items())
        param_string = "&".join(
            f"{urllib.parse.quote(str(k), safe='')}"
            f"={urllib.parse.quote(str(v), safe='')}"
            for k, v in sorted_params
        )
        
        # Create signature base string
        base_string = "&".join([
            method.upper(),
            urllib.parse.quote(url, safe=""),
            urllib.parse.quote(param_string, safe=""),
        ])
        
        # Create signing key
        signing_key = "&".join([
            urllib.parse.quote(self.api_secret, safe=""),
            urllib.parse.quote(self.access_secret, safe=""),
        ])
        
        # Generate signature
        signature = hmac.new(
            signing_key.encode(),
            base_string.encode(),
            hashlib.sha1,
        ).digest()
        
        return base64.b64encode(signature).decode()
    
    def _get_oauth_headers(
        self,
        method: str,
        url: str,
        body_params: Optional[dict] = None,
    ) -> dict:
        """Generate OAuth 1.0a headers for user context requests."""
        oauth_params = {
            "oauth_consumer_key": self.api_key,
            "oauth_nonce": base64.b64encode(str(time.time()).encode()).decode(),
            "oauth_signature_method": "HMAC-SHA1",
            "oauth_timestamp": str(int(time.time())),
            "oauth_token": self.access_token,
            "oauth_version": "1.0",
        }
        
        # Include body params for signature
        all_params = {**oauth_params}
        if body_params:
            all_params.update(body_params)
        
        # Generate signature
        oauth_params["oauth_signature"] = self._generate_oauth_signature(
            method, url, all_params
        )
        
        # Build Authorization header
        auth_header = "OAuth " + ", ".join(
            f'{urllib.parse.quote(k, safe="")}="{urllib.parse.quote(v, safe="")}"'
            for k, v in sorted(oauth_params.items())
        )
        
        return {
            "Authorization": auth_header,
            "Content-Type": "application/json",
        }
    
    # ─────────────────────────────────────────────────────────────
    # MENTION STREAMING (Filtered Stream)
    # ─────────────────────────────────────────────────────────────
    
    async def setup_stream_rules(self) -> dict:
        """Set up filtered stream rules to capture mentions."""
        async with httpx.AsyncClient() as client:
            # Get existing rules
            response = await client.get(
                f"{self.BASE_URL}/tweets/search/stream/rules",
                headers=self.bearer_headers,
            )
            existing = response.json()
            
            # Delete existing rules
            if existing.get("data"):
                rule_ids = [r["id"] for r in existing["data"]]
                await client.post(
                    f"{self.BASE_URL}/tweets/search/stream/rules",
                    headers=self.bearer_headers,
                    json={"delete": {"ids": rule_ids}},
                )
            
            # Add new rules for mentions
            response = await client.post(
                f"{self.BASE_URL}/tweets/search/stream/rules",
                headers=self.bearer_headers,
                json={
                    "add": [
                        {
                            "value": f"@{self.bot_username} -is:retweet",
                            "tag": "all_mentions",
                        },
                    ]
                },
            )
            
            return response.json()
    
    async def stream_mentions(self) -> AsyncGenerator[dict, None]:
        """
        Connect to filtered stream and yield mentions.
        This is a long-running async generator.
        """
        await self.setup_stream_rules()
        
        url = f"{self.BASE_URL}/tweets/search/stream"
        params = {
            "expansions": "author_id,referenced_tweets.id",
            "tweet.fields": "created_at,conversation_id,in_reply_to_user_id",
            "user.fields": "username,name,profile_image_url",
        }
        
        async with httpx.AsyncClient(timeout=None) as client:
            async with client.stream(
                "GET",
                url,
                headers=self.bearer_headers,
                params=params,
            ) as response:
                async for line in response.aiter_lines():
                    if line.strip():
                        try:
                            data = json.loads(line)
                            if "data" in data:
                                yield self._parse_mention(data)
                        except json.JSONDecodeError:
                            continue
    
    def _parse_mention(self, data: dict) -> dict:
        """Parse raw tweet data into structured mention."""
        tweet = data["data"]
        users = {u["id"]: u for u in data.get("includes", {}).get("users", [])}
        author = users.get(tweet["author_id"], {})
        
        # Extract the actual prompt (remove the @mention)
        text = tweet["text"]
        prompt = text.replace(f"@{self.bot_username}", "").strip()
        
        # Check if it's a reply
        is_reply = bool(tweet.get("in_reply_to_user_id"))
        referenced = tweet.get("referenced_tweets", [])
        reply_to_id = None
        if referenced:
            for ref in referenced:
                if ref.get("type") == "replied_to":
                    reply_to_id = ref.get("id")
                    break
        
        return {
            "tweet_id": tweet["id"],
            "author_id": tweet["author_id"],
            "author_username": author.get("username", "unknown"),
            "author_name": author.get("name"),
            "author_image": author.get("profile_image_url"),
            "prompt": prompt,
            "conversation_id": tweet.get("conversation_id"),
            "is_reply": is_reply,
            "reply_to_id": reply_to_id,
            "created_at": tweet.get("created_at"),
        }
    
    # ─────────────────────────────────────────────────────────────
    # POLLING FALLBACK
    # ─────────────────────────────────────────────────────────────
    
    async def poll_mentions(self, since_id: Optional[str] = None) -> list:
        """
        Poll for recent mentions. Use as fallback or supplement to streaming.
        """
        url = f"{self.BASE_URL}/users/{self.bot_user_id}/mentions"
        params = {
            "max_results": 100,
            "expansions": "author_id",
            "tweet.fields": "created_at,conversation_id,in_reply_to_user_id",
            "user.fields": "username,name,profile_image_url",
        }
        
        if since_id:
            params["since_id"] = since_id
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                url,
                headers=self.bearer_headers,
                params=params,
            )
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
                    "author_username": author.get("username"),
                    "author_name": author.get("name"),
                    "author_image": author.get("profile_image_url"),
                    "prompt": prompt,
                    "conversation_id": tweet.get("conversation_id"),
                    "is_reply": bool(tweet.get("in_reply_to_user_id")),
                    "created_at": tweet.get("created_at"),
                })
            
            return mentions
    
    # ─────────────────────────────────────────────────────────────
    # POSTING REPLIES
    # ─────────────────────────────────────────────────────────────
    
    async def reply_to_tweet(
        self,
        tweet_id: str,
        text: str,
        media_ids: Optional[list] = None,
    ) -> dict:
        """Post a reply to a tweet."""
        url = f"{self.BASE_URL}/tweets"
        
        payload = {
            "text": text,
            "reply": {
                "in_reply_to_tweet_id": tweet_id,
            },
        }
        
        if media_ids:
            payload["media"] = {"media_ids": media_ids}
        
        headers = self._get_oauth_headers("POST", url)
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                url,
                headers=headers,
                json=payload,
            )
            return response.json()
    
    async def post_build_started(self, tweet_id: str, username: str) -> dict:
        """Reply that build has started."""
        text = f"🔨 Building your app, @{username}...\n\nThis usually takes 30-60 seconds."
        return await self.reply_to_tweet(tweet_id, text)
    
    async def post_build_complete(
        self,
        tweet_id: str,
        username: str,
        project_url: str,
        studio_url: str,
        project_name: str,
    ) -> dict:
        """Reply with completed build links."""
        text = (
            f"✅ Done! Your app \"{project_name}\" is live:\n\n"
            f"🌐 {project_url}\n"
            f"🛠️ Edit: {studio_url}\n\n"
            f"Reply to this tweet to refine your project!"
        )
        return await self.reply_to_tweet(tweet_id, text)
    
    async def post_build_failed(
        self,
        tweet_id: str,
        username: str,
        error: str,
    ) -> dict:
        """Reply with build failure."""
        # Truncate error message for tweet
        error_short = error[:80] + "..." if len(error) > 80 else error
        text = (
            f"❌ Build failed, @{username}\n\n"
            f"Error: {error_short}\n\n"
            f"Try simplifying your request or being more specific!"
        )
        return await self.reply_to_tweet(tweet_id, text)
    
    async def post_rate_limited(self, tweet_id: str, username: str) -> dict:
        """Reply that user hit rate limit."""
        text = (
            f"⏳ @{username} You've hit your build limit!\n\n"
            f"Free tier: 3 builds/hour\n"
            f"Upgrade at BuildOnX.app/pro for unlimited builds 🚀"
        )
        return await self.reply_to_tweet(tweet_id, text)

