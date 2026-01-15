#!/bin/bash
# BuildOnX Railway Deployment Script
# Run this interactively to deploy to Railway

set -e

echo "🚂 BuildOnX Railway Deployment"
echo "================================"

# Check if logged in
if ! railway whoami > /dev/null 2>&1; then
    echo "⚠️  Not logged into Railway. Running login..."
    railway login
fi

# Make sure we're in the right project
echo ""
echo "📦 Current project status:"
railway status

echo ""
echo "🔧 Adding services..."

# Create services if they don't exist
echo "Creating web service..."
cd "$(dirname "$0")/../apps/web"
railway up -d

echo ""
echo "Creating api service..."
cd "$(dirname "$0")/../apps/api"
railway up -d

echo ""
echo "✅ Deployment initiated!"
echo ""
echo "Next steps:"
echo "1. Go to https://railway.app to view deployment progress"
echo "2. Configure environment variables in Railway dashboard"
echo "3. Generate domains for your services"
echo ""
echo "Required environment variables for API:"
echo "  - DATABASE_URL (use \${{Postgres.DATABASE_URL}})"
echo "  - REDIS_URL (use \${{Redis.REDIS_URL}})"
echo "  - ANTHROPIC_API_KEY"
echo "  - SECRET_KEY"
echo ""


