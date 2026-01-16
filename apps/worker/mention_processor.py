"""
HeyClaude Twitter Bot - SIMPLE VERSION
1. Poll for mentions
2. Reply with studio link
3. Call API to build
"""

import asyncio
import os
import hashlib
import hmac
import base64
import time
import urllib.parse
import uuid

import httpx
import redis.asyncio as redis

from config import settings

POLL_INTERVAL = 60
API_URL = "https://heyclaude-api-production.up.railway.app"


class TwitterClient:
    """Twitter API client with OAuth 1.0a."""
    
    BASE_URL = "https://api.twitter.com/2"
    
    def __init__(self):
        self.consumer_key = settings.twitter_api_key
        self.consumer_secret = settings.twitter_api_secret
        self.access_token = settings.twitter_access_token
        self.access_secret = settings.twitter_access_secret
        self.bot_user_id = settings.twitter_bot_user_id
        self.bot_username = settings.twitter_bot_username
    
    def _oauth_signature(self, method: str, url: str, params: dict) -> str:
        """Generate OAuth 1.0a signature."""
        sorted_params = sorted(params.items())
        param_string = "&".join(f"{k}={urllib.parse.quote(str(v), safe='')}" for k, v in sorted_params)
        
        base_string = "&".join([
            method.upper(),
            urllib.parse.quote(url, safe=""),
            urllib.parse.quote(param_string, safe=""),
        ])
        
        signing_key = f"{urllib.parse.quote(self.consumer_secret, safe='')}&{urllib.parse.quote(self.access_secret, safe='')}"
        signature = hmac.new(signing_key.encode(), base_string.encode(), hashlib.sha1)
        return base64.b64encode(signature.digest()).decode()
    
    def _oauth_header(self, method: str, url: str, extra_params: dict = None) -> str:
        """Generate OAuth 1.0a Authorization header."""
        oauth_params = {
            "oauth_consumer_key": self.consumer_key,
            "oauth_nonce": uuid.uuid4().hex,
            "oauth_signature_method": "HMAC-SHA1",
            "oauth_timestamp": str(int(time.time())),
            "oauth_token": self.access_token,
            "oauth_version": "1.0",
        }
        
        all_params = {**oauth_params, **(extra_params or {})}
        oauth_params["oauth_signature"] = self._oauth_signature(method, url, all_params)
        
        header_parts = [f'{k}="{urllib.parse.quote(str(v), safe="")}"' for k, v in sorted(oauth_params.items())]
        return "OAuth " + ", ".join(header_parts)
    
    async def get_mentions(self, since_id: str = None) -> list:
        """Get mentions of the bot."""
        if not self.bot_user_id:
            print("❌ No bot user ID")
            return []
        
        url = f"{self.BASE_URL}/users/{self.bot_user_id}/mentions"
        params = {
            "expansions": "author_id",
            "tweet.fields": "created_at",
            "user.fields": "username",
            "max_results": 10,
        }
        if since_id:
            params["since_id"] = since_id
        
        auth = self._oauth_header("GET", url, params)
        
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, headers={"Authorization": auth}, params=params)
            
            if resp.status_code != 200:
                print(f"❌ Mentions error {resp.status_code}: {resp.text[:100]}")
                return []
            
            data = resp.json()
            if not data.get("data"):
                return []
            
            users = {u["id"]: u for u in data.get("includes", {}).get("users", [])}
            
            mentions = []
            for tweet in data["data"]:
                author = users.get(tweet["author_id"], {})
                prompt = tweet["text"].replace(f"@{self.bot_username}", "").strip()
                mentions.append({
                    "id": tweet["id"],
                    "author_id": tweet["author_id"],
                    "username": author.get("username", "user"),
                    "prompt": prompt,
                })
            
            return mentions
    
    async def reply(self, tweet_id: str, text: str) -> bool:
        """Reply to a tweet."""
        url = f"{self.BASE_URL}/tweets"
        payload = {"text": text, "reply": {"in_reply_to_tweet_id": tweet_id}}
        
        auth = self._oauth_header("POST", url)
        
        async with httpx.AsyncClient() as client:
            resp = await client.post(url, headers={"Authorization": auth, "Content-Type": "application/json"}, json=payload)
            
            if resp.status_code in [200, 201]:
                print(f"✅ Replied to {tweet_id}")
                return True
            else:
                print(f"❌ Reply failed {resp.status_code}: {resp.text[:100]}")
                return False


class Bot:
    """Simple Twitter bot."""
    
    def __init__(self):
        self.twitter = TwitterClient()
        self.redis = None
        self.last_id = None
    
    async def run(self):
        """Main loop."""
        print("=" * 50)
        print("🤖 HeyClaude Bot Starting")
        print(f"📱 @{self.twitter.bot_username}")
        print(f"🆔 {self.twitter.bot_user_id}")
        print("=" * 50)
        
        if not self.twitter.bot_user_id:
            print("❌ TWITTER_BOT_USER_ID not set!")
            return
        
        self.redis = await redis.from_url(settings.redis_url)
        print("✅ Redis connected")
        
        # Get last processed ID
        last = await self.redis.get("heyclaude:last_id")
        if last:
            self.last_id = last.decode()
            print(f"📌 Resuming from {self.last_id}")
        
        print("🎯 Listening for mentions...")
        
        while True:
            try:
                await self.poll()
            except Exception as e:
                print(f"❌ Poll error: {e}")
            
            await asyncio.sleep(POLL_INTERVAL)
    
    async def poll(self):
        """Poll for new mentions."""
        mentions = await self.twitter.get_mentions(since_id=self.last_id)
        
        if not mentions:
            return
        
        print(f"📬 {len(mentions)} new mention(s)")
        
        for mention in reversed(mentions):
            # Skip own tweets
            if mention["author_id"] == self.twitter.bot_user_id:
                continue
            
            # Skip if processed
            if await self.redis.sismember("heyclaude:processed", mention["id"]):
                continue
            
            await self.handle(mention)
            
            # Mark processed
            await self.redis.sadd("heyclaude:processed", mention["id"])
            self.last_id = mention["id"]
            await self.redis.set("heyclaude:last_id", self.last_id)
    
    async def handle(self, mention: dict):
        """Handle a mention - create project and reply with studio link."""
        tweet_id = mention["id"]
        username = mention["username"]
        prompt = mention["prompt"]
        
        print(f"📥 @{username}: {prompt[:40]}...")
        
        try:
            # Call API to create project
            async with httpx.AsyncClient(timeout=120) as client:
                resp = await client.post(
                    f"{API_URL}/api/projects",
                    json={"prompt": prompt},
                )
                
                if resp.status_code != 200:
                    print(f"❌ API error: {resp.status_code}")
                    return
                
                data = resp.json()
                slug = data.get("slug")
                
                if not slug:
                    print("❌ No slug returned")
                    return
                
                # Reply with studio link
                studio_url = f"https://heyclaude.xyz/studio/{slug}"
                reply_msg = f"Hey @{username}! 👋 Your app is now being built and will be available at {studio_url}"
                await self.twitter.reply(tweet_id, reply_msg)
                
                print(f"✅ Done: {studio_url}")
                
        except Exception as e:
            print(f"❌ Error: {e}")


async def main():
    bot = Bot()
    await bot.run()


if __name__ == "__main__":
    print("Starting HeyClaude Bot...")
    asyncio.run(main())
