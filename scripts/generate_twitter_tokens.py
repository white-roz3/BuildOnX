#!/usr/bin/env python3
"""
Generate Twitter Access Token and Secret for @buildheyclaude account.

This script helps you authorize @buildheyclaude to use your Twitter app.
"""

import requests
import webbrowser
from urllib.parse import parse_qs, urlparse
import secrets

# Your API credentials from @buildappsonx developer account
API_KEY = "gWZ0wyyowU0YjBXTVINNSTCeQ"
API_SECRET = "MVjvMwBPxpk0ix0bAY7tFNpzB9lY4XfHmPxYJ9oU041B8HjoDe"

print("=" * 60)
print("Twitter OAuth 1.0a Token Generator for @buildheyclaude")
print("=" * 60)
print()

# Step 1: Get request token
print("Step 1: Requesting authorization...")
response = requests.post(
    "https://api.twitter.com/oauth/request_token",
    auth=requests.auth.HTTPBasicAuth(API_KEY, API_SECRET),
    params={
        "oauth_callback": "oob"  # out-of-band (manual PIN entry)
    }
)

if response.status_code != 200:
    print(f"Error: {response.status_code}")
    print(response.text)
    exit(1)

# Parse response
oauth_token = parse_qs(response.text)['oauth_token'][0]
oauth_token_secret = parse_qs(response.text)['oauth_token_secret'][0]

print(f"✓ Got request token: {oauth_token[:10]}...")
print()

# Step 2: Get authorization URL
auth_url = f"https://api.twitter.com/oauth/authorize?oauth_token={oauth_token}"
print("Step 2: Opening authorization URL...")
print(f"URL: {auth_url}")
print()
print("⚠️  IMPORTANT: Make sure you are logged into Twitter as @buildheyclaude!")
print("   (If you're logged in as a different account, log out first)")
print()

# Try to open in browser
try:
    webbrowser.open(auth_url)
    print("✓ Opened authorization URL in your browser")
except:
    print("Could not open browser automatically. Please open this URL manually:")
    print()

print(auth_url)
print()

# Step 3: Get PIN from user
print("=" * 60)
pin = input("After authorizing, enter the PIN code from Twitter: ").strip()

if not pin:
    print("Error: PIN is required")
    exit(1)

print()

# Step 4: Exchange PIN for access token
print("Step 3: Exchanging PIN for access token...")
response = requests.post(
    "https://api.twitter.com/oauth/access_token",
    auth=requests.auth.HTTPBasicAuth(API_KEY, API_SECRET),
    params={
        "oauth_token": oauth_token,
        "oauth_verifier": pin
    }
)

if response.status_code != 200:
    print(f"Error: {response.status_code}")
    print(response.text)
    exit(1)

# Parse access token
tokens = parse_qs(response.text)
access_token = tokens['oauth_token'][0]
access_token_secret = tokens['oauth_token_secret'][0]
user_id = tokens['user_id'][0]
screen_name = tokens['screen_name'][0]

print("=" * 60)
print("✓ SUCCESS! Tokens generated for @buildheyclaude")
print("=" * 60)
print()
print("Please provide these values to update Railway:")
print()
print(f"TWITTER_ACCESS_TOKEN={access_token}")
print(f"TWITTER_ACCESS_SECRET={access_token_secret}")
print(f"TWITTER_BOT_USER_ID={user_id}")
print()
print(f"Authorized account: @{screen_name}")
print(f"User ID: {user_id}")
print()
print("=" * 60)

