-- Migration: Add project_versions, project_likes, and project_comments tables
-- Run this with: psql $DATABASE_URL -f migrations/001_add_versions_likes_comments.sql

-- Create project_versions table
CREATE TABLE IF NOT EXISTS project_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL DEFAULT 1,
    files JSONB NOT NULL,
    change_description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_project_version FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Create index on project_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_project_versions_project_id ON project_versions(project_id);
CREATE INDEX IF NOT EXISTS idx_project_versions_version_number ON project_versions(project_id, version_number DESC);

-- Create project_likes table
CREATE TABLE IF NOT EXISTS project_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    liker_id VARCHAR(256) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_project_like FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    CONSTRAINT _project_liker_uc UNIQUE (project_id, liker_id)
);

-- Create index on project_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_project_likes_project_id ON project_likes(project_id);
CREATE INDEX IF NOT EXISTS idx_project_likes_liker_id ON project_likes(liker_id);

-- Create project_comments table
CREATE TABLE IF NOT EXISTS project_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    author VARCHAR(256) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_project_comment FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Create index on project_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_project_comments_project_id ON project_comments(project_id);
CREATE INDEX IF NOT EXISTS idx_project_comments_created_at ON project_comments(project_id, created_at DESC);

