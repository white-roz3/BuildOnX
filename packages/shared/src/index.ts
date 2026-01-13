/**
 * BuildOnX Shared Types and Utilities
 */

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface User {
  id: string;
  x_user_id: string;
  x_username: string;
  x_display_name?: string;
  x_profile_image?: string;
  tier: "free" | "pro" | "enterprise";
  credits: number;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  user_id?: string;
  slug: string;
  name?: string;
  description?: string;
  original_prompt: string;
  refined_prompt?: string;
  template: TemplateType;
  tech_stack: Record<string, unknown>;
  files: Record<string, string>;
  entry_point: string;
  deployment_url?: string;
  deployment_status: DeploymentStatus;
  deployment_id?: string;
  is_public: boolean;
  views: number;
  forks: number;
  source_tweet_id?: string;
  reply_tweet_id?: string;
  created_at: string;
  updated_at: string;
  expires_at?: string;
}

export interface Build {
  id: string;
  project_id: string;
  prompt: string;
  prompt_type: PromptType;
  status: BuildStatus;
  started_at?: string;
  completed_at?: string;
  ai_model?: string;
  ai_request_id?: string;
  tokens_used?: number;
  generated_files: Record<string, string>;
  build_logs?: string[];
  error_message?: string;
  created_at: string;
}

export interface Tweet {
  id: string;
  tweet_id: string;
  user_id?: string;
  project_id?: string;
  tweet_type?: TweetType;
  content?: string;
  conversation_id?: string;
  processed: boolean;
  processed_at?: string;
  created_at: string;
}

export interface Mention {
  tweet_id: string;
  author_id: string;
  author_username: string;
  author_name?: string;
  author_image?: string;
  prompt: string;
  conversation_id?: string;
  is_reply: boolean;
  reply_to_id?: string;
  created_at?: string;
}

// ─────────────────────────────────────────────────────────────
// Enums / Union Types
// ─────────────────────────────────────────────────────────────

export type TemplateType = "static-site" | "react-app" | "dashboard" | "api-backend";

export type DeploymentStatus =
  | "pending"
  | "building"
  | "deploying"
  | "live"
  | "failed"
  | "expired";

export type BuildStatus =
  | "queued"
  | "building"
  | "deploying"
  | "complete"
  | "failed";

export type PromptType = "initial" | "refine" | "fork";

export type TweetType = "mention" | "reply" | "quote";

export type UserTier = "free" | "pro" | "enterprise";

// ─────────────────────────────────────────────────────────────
// API Request/Response Types
// ─────────────────────────────────────────────────────────────

export interface CreateProjectRequest {
  prompt: string;
  template?: TemplateType;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  files?: Record<string, string>;
  is_public?: boolean;
}

export interface RefineProjectRequest {
  instruction: string;
  current_files?: Record<string, string>;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
}

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

export const TEMPLATES: Record<TemplateType, { name: string; description: string }> = {
  "static-site": {
    name: "Static Site",
    description: "Vanilla HTML/CSS/JS static website",
  },
  "react-app": {
    name: "React App",
    description: "Interactive React application with Tailwind",
  },
  dashboard: {
    name: "Dashboard",
    description: "Data visualization dashboard with charts",
  },
  "api-backend": {
    name: "API Backend",
    description: "FastAPI Python REST API",
  },
};

export const TIER_LIMITS: Record<UserTier, { builds_per_hour: number; builds_per_day: number; project_lifetime_days: number | null }> = {
  free: {
    builds_per_hour: 3,
    builds_per_day: 10,
    project_lifetime_days: 7,
  },
  pro: {
    builds_per_hour: 100,
    builds_per_day: 1000,
    project_lifetime_days: null, // forever
  },
  enterprise: {
    builds_per_hour: 1000,
    builds_per_day: 10000,
    project_lifetime_days: null,
  },
};

// ─────────────────────────────────────────────────────────────
// Utility Functions
// ─────────────────────────────────────────────────────────────

/**
 * Generate a URL-friendly slug from text
 */
export function generateSlug(text: string, maxLength = 48): string {
  const words = text.toLowerCase().split(/\s+/);
  const stopWords = new Set([
    "a", "an", "the", "make", "me", "create", "build", "with",
    "and", "or", "for", "to", "of", "in", "on", "at", "by",
  ]);

  const meaningful = words
    .filter((w) => !stopWords.has(w))
    .slice(0, 4);

  const base = (meaningful.length > 0 ? meaningful : words.slice(0, 2))
    .join("-")
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, maxLength - 6);

  const suffix = Math.random().toString(36).substring(2, 6);
  return base ? `${base}-${suffix}` : `project-${suffix}`;
}

/**
 * Detect template type from prompt keywords
 */
export function detectTemplate(prompt: string): TemplateType {
  const lower = prompt.toLowerCase();

  if (/dashboard|admin|analytics|chart|metrics|data/.test(lower)) {
    return "dashboard";
  }
  if (/api|backend|server|endpoint|rest|graphql/.test(lower)) {
    return "api-backend";
  }
  if (/react|interactive|component|spa|app|dynamic/.test(lower)) {
    return "react-app";
  }
  return "static-site";
}

/**
 * Get file language from extension
 */
export function getFileLanguage(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    html: "html",
    css: "css",
    js: "javascript",
    ts: "typescript",
    jsx: "javascript",
    tsx: "typescript",
    json: "json",
    py: "python",
    md: "markdown",
    sql: "sql",
    yml: "yaml",
    yaml: "yaml",
  };
  return map[ext || ""] || "plaintext";
}

/**
 * Format a date for display
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateStr);
}

