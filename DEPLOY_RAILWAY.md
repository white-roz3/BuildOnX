# Deploy HeyClaude to Railway

## Architecture Overview

HeyClaude needs **5 services** total:

| Service | Type | Purpose |
|---------|------|---------|
| `postgres` | Database | Main data store |
| `redis` | Database | Caching & rate limiting |
| `web` | App | Next.js frontend (public URL) |
| `api` | App | FastAPI backend |
| `worker` | App | Twitter mention processor |

---

## Step 1: Push Code to GitHub

```bash
cd /Users/white_roze/BuildOnX
git add .
git commit -m "Railway deployment config"
git push origin main
```

---

## Step 2: Create Railway Project (Dashboard)

1. Go to [railway.app](https://railway.app)
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Connect your GitHub account and select **HeyClaude** repo

---

## Step 3: Add Databases

In your Railway project:

1. Click **"+ New"** → **"Database"** → **"PostgreSQL"**
2. Click **"+ New"** → **"Database"** → **"Redis"**

**Delete any extra databases** you don't need.

---

## Step 4: Add Application Services

### 4.1 Add Web Service (Frontend)

1. Click **"+ New"** → **"GitHub Repo"**
2. Select your HeyClaude repo
3. Click **"Add Root Directory"** → Enter: `apps/web`
4. Railway will detect Next.js and deploy

### 4.2 Add API Service (Backend)

1. Click **"+ New"** → **"GitHub Repo"**
2. Select your HeyClaude repo
3. Click **"Add Root Directory"** → Enter: `apps/api`
4. Railway will detect Python/FastAPI and deploy

### 4.3 Add Worker Service

1. Click **"+ New"** → **"GitHub Repo"**
2. Select your HeyClaude repo
3. Click **"Add Root Directory"** → Enter: `apps/worker`

---

## Step 5: Configure Environment Variables

Click on each service and add these variables:

### For `api` and `worker`:

```
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
SECRET_KEY=your-secret-key-here
BASE_DOMAIN=heyclaude.xyz
TWITTER_API_KEY=your-twitter-key
TWITTER_API_SECRET=your-twitter-secret
TWITTER_BEARER_TOKEN=your-bearer-token
TWITTER_ACCESS_TOKEN=your-access-token
TWITTER_ACCESS_SECRET=your-access-secret
TWITTER_BOT_USER_ID=your-bot-user-id
TWITTER_BOT_USERNAME=buildheyclaude
ANTHROPIC_API_KEY=your-anthropic-key
```

### For `web`:

```
NEXT_PUBLIC_API_URL=${{api.RAILWAY_PUBLIC_DOMAIN}}
```

---

## Step 6: Generate Public Domain

1. Click on the **`web`** service
2. Go to **Settings** → **Networking**
3. Click **"Generate Domain"**
4. You'll get a URL like: `heyclaude-web-production.up.railway.app`

This is your **public frontend URL**! 🎉

---

## Step 7: (Optional) Custom Domain

1. In `web` service → **Settings** → **Networking**
2. Click **"+ Custom Domain"**
3. Enter: `heyclaude.xyz`
4. Add the CNAME record to your DNS provider

---

## Troubleshooting

### "Service not deploying"
- Check the **Deploy Logs** tab for errors
- Ensure `railway.toml` exists in the service's root directory

### "Database connection failed"
- Use Railway's variable references: `${{Postgres.DATABASE_URL}}`
- Make sure the database is in the same project

### "Cannot find module"
- For `web`: Make sure root directory is `apps/web`
- Run `npm ci` not `npm install`

---

## Final Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Railway Project                       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │   web    │  │   api    │  │  worker  │              │
│  │ (Next.js)│  │(FastAPI) │  │ (Python) │              │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘              │
│       │             │             │                     │
│       │      ┌──────┴──────┐      │                     │
│       │      │             │      │                     │
│       ▼      ▼             ▼      ▼                     │
│  ┌──────────────┐    ┌──────────────┐                  │
│  │   PostgreSQL │    │    Redis     │                  │
│  └──────────────┘    └──────────────┘                  │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

Your public URL will be the **`web`** service's domain!
