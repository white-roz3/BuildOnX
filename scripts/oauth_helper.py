#!/usr/bin/env python3
"""
OAuth 1.0a helper for Twitter - generates tokens for @buildheyclaude
"""

import urllib.parse
import urllib.request
import hashlib
import hmac
import base64
import time
import secrets
import webbrowser

API_KEY = "gWZ0wyyowU0YjBXTVINNSTCeQ"
API_SECRET = "MVjvMwBPxpk0ix0bAY7tFNpzB9lY4XfHmPxYJ9oU041B8HjoDe"

def generate_signature(method, url, params, consumer_secret, token_secret=""):
    """Generate OAuth 1.0a signature"""
    # Create parameter string
    sorted_params = sorted(params.items())
    param_string = "&".join([f"{k}={urllib.parse.quote(str(v), safe='')}" for k, v in sorted_params])
    
    # Create signature base string
    signature_base = f"{method}&{urllib.parse.quote(url, safe='')}&{urllib.parse.quote(param_string, safe='')}"
    
    # Create signing key
    signing_key = f"{urllib.parse.quote(consumer_secret, safe='')}&{urllib.parse.quote(token_secret, safe='')}"
    
    # Generate signature
    signature = base64.b64encode(
        hmac.new(signing_key.encode(), signature_base.encode(), hashlib.sha1).digest()
    ).decode()
    
    return signature

def get_request_token():
    """Step 1: Get OAuth request token"""
    url = "https://api.twitter.com/oauth/request_token"
    method = "POST"
    
    oauth_params = {
        "oauth_callback": "oob",
        "oauth_consumer_key": API_KEY,
        "oauth_nonce": secrets.token_urlsafe(16),
        "oauth_signature_method": "HMAC-SHA1",
        "oauth_timestamp": str(int(time.time())),
        "oauth_version": "1.0"
    }
    
    # Generate signature
    oauth_params["oauth_signature"] = generate_signature(method, url, oauth_params, API_SECRET)
    
    # Create authorization header
    auth_header = "OAuth " + ", ".join([f'{k}="{urllib.parse.quote(str(v), safe="")}"' for k, v in sorted(oauth_params.items())])
    
    # Make request
    req = urllib.request.Request(url, method=method)
    req.add_header("Authorization", auth_header)
    
    try:
        with urllib.request.urlopen(req) as response:
            result = response.read().decode()
            params = dict(urllib.parse.parse_qsl(result))
            return params.get("oauth_token"), params.get("oauth_token_secret")
    except Exception as e:
        print(f"Error getting request token: {e}")
        return None, None

def get_access_token(oauth_token, oauth_token_secret, pin):
    """Step 3: Exchange PIN for access token"""
    url = "https://api.twitter.com/oauth/access_token"
    method = "POST"
    
    oauth_params = {
        "oauth_consumer_key": API_KEY,
        "oauth_token": oauth_token,
        "oauth_verifier": pin,
        "oauth_nonce": secrets.token_urlsafe(16),
        "oauth_signature_method": "HMAC-SHA1",
        "oauth_timestamp": str(int(time.time())),
        "oauth_version": "1.0"
    }
    
    # Generate signature
    oauth_params["oauth_signature"] = generate_signature(method, url, oauth_params, API_SECRET, oauth_token_secret)
    
    # Create authorization header
    auth_header = "OAuth " + ", ".join([f'{k}="{urllib.parse.quote(str(v), safe="")}"' for k, v in sorted(oauth_params.items())])
    
    # Create request body
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
        import sys
        import traceback
        traceback.print_exc()
        return None

# Main flow
print("=" * 60)
print("Twitter OAuth 1.0a Token Generator for @buildheyclaude")
print("=" * 60)
print()

print("Step 1: Getting request token...")
oauth_token, oauth_token_secret = get_request_token()

if not oauth_token:
    print("❌ Failed to get request token")
    exit(1)

print(f"✓ Got request token: {oauth_token[:20]}...")
print()

# Step 2: Show authorization URL
auth_url = f"https://api.twitter.com/oauth/authorize?oauth_token={oauth_token}"
print("=" * 60)
print("Step 2: AUTHORIZATION REQUIRED")
print("=" * 60)
print()
print("⚠️  IMPORTANT: You must authorize this app as @buildheyclaude!")
print("   Make sure you are logged into Twitter as @buildheyclaude")
print()
print("Opening authorization URL...")
print()
print(auth_url)
print()

try:
    webbrowser.open(auth_url)
    print("✓ Opened in your browser")
except:
    print("Could not open browser. Please copy the URL above and open it manually.")

print()
print("After authorizing, Twitter will show you a PIN code.")
print()

# Step 3: Get PIN and exchange
pin = input("Enter the PIN code from Twitter: ").strip()

if not pin:
    print("❌ PIN is required")
    exit(1)

print()
print("Step 3: Exchanging PIN for access token...")
tokens = get_access_token(oauth_token, oauth_token_secret, pin)

if not tokens:
    print("❌ Failed to get access token")
    exit(1)

print()
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
print("=" * 60)

