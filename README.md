# HeyClaude 🚀

**Tweet to Deploy** - Build apps with a tweet. Just @ us.

## What is HeyClaude?

HeyClaude is a platform that lets anyone tweet at @HeyClaude with a natural language prompt and receive a working deployed application in response. Users can then refine their projects through a web interface.

### Example Interaction

```
User: @HeyClaude make me a videogame news aggregator with dark mode and RSS feeds from IGN, Kotaku, and Polygon

HeyClaude: 🔨 Building your app...

HeyClaude: ✅ Done! Your videogame news site is live:
→ https://heyclaude.app/p/gamer-news-7x9k
Edit & customize: https://heyclaude.app/studio/gamer-news-7x9k
```

## Tech Stack

- **Backend**: FastAPI, PostgreSQL, Redis
- **Frontend**: Next.js 14+, TailwindCSS, Monaco Editor
- **AI**: Anthropic Claude API
- **Deployment**: Fly.io Machines API
- **Twitter**: Twitter API v2

## Project Structure

```
heyclaude/
├── apps/
│   ├── api/                    # FastAPI backend
│   │   ├── app/
│   │   │   ├── main.py         # Application entry
│   │   │   ├── models/         # SQLAlchemy models
│   │   │   ├── routers/        # API endpoints
│   │   │   ├── services/       # Business logic
│   │   │   │   ├── builder.py      # AI code generation
│   │   │   │   ├── deployer.py     # Fly.io deployment
│   │   │   │   ├── twitter.py      # Twitter API
│   │   │   │   ├── moderator.py    # Content moderation
│   │   │   │   ├── analytics.py    # Usage analytics
│   │   │   │   ├── alerts.py       # Discord/Slack alerts
│   │   │   │   └── cleanup.py      # Resource cleanup
│   │   │   └── middleware/     # Rate limiting, etc.
│   │   └── scripts/            # Cron jobs
│   ├── web/                    # Next.js frontend
│   │   └── src/
│   │       ├── app/            # Pages
│   │       ├── components/     # React components
│   │       └── lib/            # Utilities
│   └── worker/                 # Twitter mention processor
├── packages/
│   └── shared/                 # Shared types/utils
├── infrastructure/             # Docker, nginx configs
└── templates/                  # Starter project templates
```

## Features

### Core Features
- 🐦 **Tweet-to-Deploy**: Mention @HeyClaude to generate apps
- 🤖 **AI Code Generation**: Claude-powered code generation
- 🚀 **Instant Deployment**: Live URLs in seconds via Fly.io
- ✏️ **Studio Editor**: Web-based code editor with live preview
- 🔄 **AI Refinement**: Refine projects via chat or tweet replies
- 🔀 **Fork & Remix**: Fork public projects

### Security & Safety
- 🛡️ **Content Moderation**: Blocks phishing, malware, prompt injection
- 🚦 **Rate Limiting**: IP and user-based request throttling
- 🔒 **Code Scanning**: Detects malicious patterns in generated code

### Observability
- 📊 **Analytics Dashboard**: Build stats, usage metrics, popular projects
- 🔔 **Discord/Slack Alerts**: Notifications for failures and events
- 📈 **Usage Tracking**: Per-user token and compute tracking
- 🧹 **Auto Cleanup**: Expired project removal

### Real-Time
- ⚡ **WebSocket Updates**: Live build progress via WebSocket
- 📱 **Build Progress UI**: Visual progress component

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- Docker & Docker Compose
- Twitter API credentials (Elevated or Pro tier)
- Anthropic API key
- Fly.io account

### Development Setup

1. **Clone and start infrastructure:**

```bash
cd infrastructure
docker-compose up -d db redis
```

2. **Set up backend:**

```bash
cd apps/api
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Copy and edit environment variables
cp .env.example .env
# Edit .env with your credentials

# Run migrations (tables auto-created)
uvicorn app.main:app --reload
```

3. **Set up frontend:**

```bash
cd apps/web
npm install
npm run dev
```

4. **Start worker (optional - for Twitter integration):**

```bash
cd apps/worker
python mention_processor.py
```

5. **Visit** `http://localhost:3000` 🎉

## Environment Variables

```bash
# Required
DATABASE_URL=postgresql+asyncpg://heyclaude:heyclaude@localhost:5432/heyclaude
REDIS_URL=redis://localhost:6379
ANTHROPIC_API_KEY=sk-ant-...

# Twitter (for bot functionality)
TWITTER_API_KEY=...
TWITTER_API_SECRET=...
TWITTER_BEARER_TOKEN=...
TWITTER_ACCESS_TOKEN=...
TWITTER_ACCESS_SECRET=...
TWITTER_BOT_USER_ID=...
TWITTER_BOT_USERNAME=HeyClaude

# Fly.io (for deployment)
FLY_API_TOKEN=...
FLY_ORG=...

# Optional - Alerts
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...

# Optional - Admin
ADMIN_API_KEY=your-secret-admin-key

# App Settings
DEBUG=true
SECRET_KEY=change-me-in-production
BASE_DOMAIN=heyclaude.app
```

## API Endpoints

### Projects
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/projects` | List public projects |
| `GET` | `/api/projects/{slug}` | Get project details |
| `POST` | `/api/projects` | Create from prompt |
| `PATCH` | `/api/projects/{slug}` | Update project |
| `POST` | `/api/projects/{slug}/refine` | AI refinement |
| `POST` | `/api/projects/{slug}/fork` | Fork project |
| `DELETE` | `/api/projects/{slug}` | Delete project |

### Builds
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/builds/project/{slug}` | Build history |
| `GET` | `/api/builds/{id}/status` | Build status (polling) |

### WebSocket
| Endpoint | Description |
|----------|-------------|
| `ws://host/ws/build/{build_id}` | Real-time build updates |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/admin/stats` | Dashboard analytics |
| `GET` | `/api/admin/popular` | Popular projects |
| `POST` | `/api/admin/cleanup/all` | Run cleanup |

## Cron Jobs

Set up these cron jobs for production:

```bash
# Cleanup expired projects (hourly)
0 * * * * cd /app && python scripts/cleanup_cron.py

# Alternative: Run cleanup via API
0 * * * * curl -X POST -H "X-Admin-Key: $ADMIN_KEY" https://api.heyclaude.app/api/admin/cleanup/all
```

## Pricing Tiers

| Feature | Free | Pro ($19/mo) |
|---------|------|--------------|
| Builds | 3/day | Unlimited |
| Project lifetime | 7 days | Forever |
| Custom domains | ❌ | ✅ |
| Priority builds | ❌ | ✅ |
| API access | ❌ | ✅ |

## Content Moderation

HeyClaude blocks:
- 🚫 Phishing pages (fake login forms)
- 🚫 Malware/cryptominers
- 🚫 Credential stealers
- 🚫 Prompt injection attempts
- 🚫 Illegal content requests

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Twitter                                  │
│                           │                                      │
│                    @HeyClaude mention                             │
│                           ▼                                      │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                     Worker                                   │ │
│  │  1. Poll/Stream mentions                                     │ │
│  │  2. Content moderation check                                 │ │
│  │  3. Rate limit check                                         │ │
│  │  4. Generate code (Claude AI)                                │ │
│  │  5. Deploy (Fly.io)                                          │ │
│  │  6. Reply with URL                                           │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                           │                                      │
│                           ▼                                      │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    FastAPI Backend                           │ │
│  │  • Projects API          • WebSocket updates                 │ │
│  │  • Builds API            • Rate limiting                     │ │
│  │  • Auth API              • Analytics                         │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                           │                                      │
│              ┌────────────┼────────────┐                        │
│              ▼            ▼            ▼                        │
│         PostgreSQL      Redis      Fly.io                       │
│         (data)         (cache)    (hosting)                     │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                   Next.js Frontend                           │ │
│  │  • Landing page      • Studio editor                         │ │
│  │  • Project viewer    • Build progress                        │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## License

MIT

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

Built with ❤️ and Claude
