# How to Get Access Token for @buildheyclaude

The Twitter Developer Portal "Regenerate" only works for the account that owns the app. To authorize @buildheyclaude, we need to use OAuth 1.0a.

## Quick Method: Use Postman or OAuth Tool

1. **Use Postman's OAuth 1.0 helper:**
   - Install Postman
   - Create a new request to `https://api.twitter.com/oauth/request_token`
   - In Authorization tab, select "OAuth 1.0"
   - Enter:
     - Consumer Key: `gWZ0wyyowU0YjBXTVINNSTCeQ`
     - Consumer Secret: `MVjvMwBPxpk0ix0bAY7tFNpzB9lY4XfHmPxYJ9oU041B8HjoDe`
     - Callback URL: `oob`
   - Click "Get Request Token"
   - Copy the authorization URL and open it in a browser
   - **Make sure you're logged into Twitter as @buildheyclaude**
   - Authorize the app
   - Copy the PIN code
   - Exchange PIN for access token

2. **Or use an online OAuth tool:**
   - Go to: https://oauth.net/core/1.0a/
   - Or use: https://www.postman.com/downloads/ (has OAuth helper built-in)

## Manual Method (using curl)

### Step 1: Get Request Token
```bash
curl -X POST \
  'https://api.twitter.com/oauth/request_token?oauth_callback=oob' \
  --user 'gWZ0wyyowU0YjBXTVINNSTCeQ:MVjvMwBPxpk0ix0bAY7tFNpzB9lY4XfHmPxYJ9oU041B8HjoDe'
```

This returns: `oauth_token=...&oauth_token_secret=...`

### Step 2: Authorize
Open in browser (logged in as @buildheyclaude):
```
https://api.twitter.com/oauth/authorize?oauth_token=[oauth_token_from_step1]
```

### Step 3: Get PIN
After authorizing, Twitter will show a PIN code.

### Step 4: Exchange PIN for Access Token
```bash
curl -X POST \
  'https://api.twitter.com/oauth/access_token?oauth_token=[oauth_token]&oauth_verifier=[PIN]' \
  --user 'gWZ0wyyowU0YjBXTVINNSTCeQ:MVjvMwBPxpk0ix0bAY7tFNpzB9lY4XfHmPxYJ9oU041B8HjoDe'
```

This returns your Access Token and Secret for @buildheyclaude!

