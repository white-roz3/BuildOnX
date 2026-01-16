#!/usr/bin/env python3
"""
Complete OAuth flow with PIN code
"""

import urllib.parse
import urllib.request
import hashlib
import hmac
import base64
import time
import secrets
import sys

API_KEY = "gWZ0wyyowU0YjBXTVINNSTCeQ"
API_SECRET = "MVjvMwBPxpk0ix0bAY7tFNpzB9lY4XfHmPxYJ9oU041B8HjoDe"

# These are from the most recent request
OAUTH_TOKEN = "-pMCCgAAAAAB6_BaAAABm8PuXYo"

def generate_signature(method, url, params, consumer_secret, token_secret=""):
    """Generate OAuth 1.0a signature"""
    sorted_params = sorted(params.items())
    param_string = "&".join([f"{k}={urllib.parse.quote(str(v), safe='')}" for k, v in sorted_params])
    
    signature_base = f"{method}&{urllib.parse.quote(url, safe='')}&{urllib.parse.quote(param_string, safe='')}"
    signing_key = f"{urllib.parse.quote(consumer_secret, safe='')}&{urllib.parse.quote(token_secret, safe='')}"
    
    signature = base64.b64encode(
        hmac.new(signing_key.encode(), signature_base.encode(), hashlib.sha1).digest()
    ).decode()
    
    return signature

def get_access_token(oauth_token, pin):
    """Exchange PIN for access token"""
    url = "https://api.twitter.com/oauth/access_token"
    method = "POST"
    
    # First, we need to get the oauth_token_secret from the request token
    # Since we don't have it, we'll try without it first, or we need to regenerate
    
    # Actually, let's regenerate the request token and get both token and secret
    oauth_params = {
        "oauth_callback": "oob",
        "oauth_consumer_key": API_KEY,
        "oauth_nonce": secrets.token_urlsafe(16),
        "oauth_signature_method": "HMAC-SHA1",
        "oauth_timestamp": str(int(time.time())),
        "oauth_version": "1.0"
    }
    
    oauth_params["oauth_signature"] = generate_signature("POST", "https://api.twitter.com/oauth/request_token", oauth_params, API_SECRET)
    
    auth_header = "OAuth " + ", ".join([f'{k}="{urllib.parse.quote(str(v), safe="")}"' for k, v in sorted(oauth_params.items())])
    
    req = urllib.request.Request("https://api.twitter.com/oauth/request_token", method="POST")
    req.add_header("Authorization", auth_header)
    
    try:
        with urllib.request.urlopen(req) as response:
            result = response.read().decode()
            params = dict(urllib.parse.parse_qsl(result))
            stored_token = params.get("oauth_token")
            stored_secret = params.get("oauth_token_secret")
    except Exception as e:
        print(f"Error: {e}")
        return None
    
    # Now use the stored token (or the provided one) with the PIN
    oauth_params = {
        "oauth_consumer_key": API_KEY,
        "oauth_token": oauth_token,
        "oauth_verifier": pin,
        "oauth_nonce": secrets.token_urlsafe(16),
        "oauth_signature_method": "HMAC-SHA1",
        "oauth_timestamp": str(int(time.time())),
        "oauth_version": "1.0"
    }
    
    # We need the token secret, but we don't have it. The token might be expired.
    # Let's try with empty secret first
    oauth_params["oauth_signature"] = generate_signature(method, url, oauth_params, API_SECRET, "")
    
    auth_header = "OAuth " + ", ".join([f'{k}="{urllib.parse.quote(str(v), safe="")}"' for k, v in sorted(oauth_params.items())])
    
    data = urllib.parse.urlencode({"oauth_verifier": pin}).encode()
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Authorization", auth_header)
    
    try:
        with urllib.request.urlopen(req) as response:
            result = response.read().decode()
            params = dict(urllib.parse.parse_qsl(result))
            return params
    except Exception as e:
        print(f"Error getting access token: {e}")
        return None

pin = sys.argv[1] if len(sys.argv) > 1 else "4008819"
print(f"Using PIN: {pin}")
print()

tokens = get_access_token(OAUTH_TOKEN, pin)

if tokens:
    print("=" * 60)
    print("✓ SUCCESS! Tokens generated")
    print("=" * 60)
    print()
    print("Copy these values:")
    print()
    print(f"TWITTER_ACCESS_TOKEN={tokens.get('oauth_token')}")
    print(f"TWITTER_ACCESS_SECRET={tokens.get('oauth_token_secret')}")
    print(f"TWITTER_BOT_USER_ID={tokens.get('user_id')}")
    print()
    print(f"Authorized account: @{tokens.get('screen_name')}")
    print()
else:
    print("❌ Failed. The OAuth token may have expired.")
    print("Please run the oauth_helper.py script again to get a fresh authorization URL.")

