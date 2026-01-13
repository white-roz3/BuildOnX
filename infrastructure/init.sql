-- BuildOnX Database Initialization
-- This script runs on first database creation

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    x_user_id VARCHAR(64) UNIQUE NOT NULL,
    x_username VARCHAR(64) NOT NULL,
    x_display_name VARCHAR(256),
    x_profile_image TEXT,
    access_token_encrypted TEXT,
    refresh_token_encrypted TEXT,
    tier VARCHAR(32) DEFAULT 'free',
    credits INTEGER DEFAULT 5,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    slug VARCHAR(64) UNIQUE NOT NULL,
    name VARCHAR(256),
    description TEXT,
    original_prompt TEXT NOT NULL,
    refined_prompt TEXT,
    template VARCHAR(64) DEFAULT 'static-site',
    tech_stack JSONB DEFAULT '{}',
    files JSONB DEFAULT '{}',
    entry_point VARCHAR(256) DEFAULT 'index.html',
    deployment_url TEXT,
    deployment_status VARCHAR(32) DEFAULT 'pending',
    deployment_id VARCHAR(128),
    is_public BOOLEAN DEFAULT true,
    views INTEGER DEFAULT 0,
    forks INTEGER DEFAULT 0,
    source_tweet_id VARCHAR(64),
    reply_tweet_id VARCHAR(64),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

-- Builds table
CREATE TABLE IF NOT EXISTS builds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    prompt TEXT NOT NULL,
    prompt_type VARCHAR(32) DEFAULT 'initial',
    status VARCHAR(32) DEFAULT 'queued',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    ai_model VARCHAR(64),
    ai_request_id VARCHAR(128),
    tokens_used INTEGER,
    generated_files JSONB DEFAULT '{}',
    build_logs TEXT[],
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tweets table
CREATE TABLE IF NOT EXISTS tweets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tweet_id VARCHAR(64) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id),
    project_id UUID REFERENCES projects(id),
    tweet_type VARCHAR(32),
    content TEXT,
    conversation_id VARCHAR(64),
    processed BOOLEAN DEFAULT false,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Usage records table (for billing/analytics)
CREATE TABLE IF NOT EXISTS usage_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(32) NOT NULL,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    build_id UUID REFERENCES builds(id) ON DELETE SET NULL,
    tokens_used INTEGER DEFAULT 0,
    compute_seconds INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_slug ON projects(slug);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(deployment_status);
CREATE INDEX IF NOT EXISTS idx_builds_project ON builds(project_id);
CREATE INDEX IF NOT EXISTS idx_builds_status ON builds(status);
CREATE INDEX IF NOT EXISTS idx_tweets_tweet_id ON tweets(tweet_id);
CREATE INDEX IF NOT EXISTS idx_tweets_processed ON tweets(processed) WHERE NOT processed;
CREATE INDEX IF NOT EXISTS idx_tweets_conversation ON tweets(conversation_id);
CREATE INDEX IF NOT EXISTS idx_usage_user_date ON usage_records(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_usage_action_date ON usage_records(action, created_at);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

