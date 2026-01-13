/**
 * API client for BuildOnX
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

interface RequestOptions extends RequestInit {
  token?: string;
}

async function request<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { token, ...fetchOptions } = options;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

// ─────────────────────────────────────────────────────────────
// Projects
// ─────────────────────────────────────────────────────────────

export interface Project {
  id: string;
  slug: string;
  name: string;
  description: string;
  files: Record<string, string>;
  entry_point: string;
  deployment_url: string;
  deployment_status: string;
  original_prompt: string;
  views: number;
  forks: number;
  created_at: string;
}

export interface ProjectListResponse {
  items: Project[];
  total: number;
  page: number;
  per_page: number;
}

export const projects = {
  list: (page = 1, perPage = 20) =>
    request<ProjectListResponse>(`/api/projects?page=${page}&per_page=${perPage}`),

  get: (slug: string) => request<Project>(`/api/projects/${slug}`),

  create: (prompt: string, template?: string) =>
    request<Project>("/api/projects", {
      method: "POST",
      body: JSON.stringify({ prompt, template }),
    }),

  update: (slug: string, data: Partial<Project>) =>
    request<Project>(`/api/projects/${slug}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  refine: (slug: string, instruction: string, currentFiles?: Record<string, string>) =>
    request<Project>(`/api/projects/${slug}/refine`, {
      method: "POST",
      body: JSON.stringify({ instruction, current_files: currentFiles }),
    }),

  delete: (slug: string) =>
    request<{ status: string }>(`/api/projects/${slug}`, {
      method: "DELETE",
    }),

  fork: (slug: string) =>
    request<Project>(`/api/projects/${slug}/fork`, {
      method: "POST",
    }),
};

// ─────────────────────────────────────────────────────────────
// Builds
// ─────────────────────────────────────────────────────────────

export interface Build {
  id: string;
  project_id: string;
  prompt: string;
  status: string;
  started_at: string;
  completed_at: string;
  tokens_used: number;
  error_message?: string;
  created_at: string;
}

export interface BuildListResponse {
  items: Build[];
  total: number;
  page: number;
  per_page: number;
}

export const builds = {
  listForProject: (slug: string, page = 1) =>
    request<BuildListResponse>(`/api/builds/project/${slug}?page=${page}`),

  get: (buildId: string) => request<Build>(`/api/builds/${buildId}`),

  getStatus: (buildId: string) =>
    request<{ build_id: string; status: string; error?: string }>(
      `/api/builds/${buildId}/status`
    ),
};

// ─────────────────────────────────────────────────────────────
// Auth
// ─────────────────────────────────────────────────────────────

export interface User {
  id: string;
  x_username: string;
  x_display_name?: string;
  x_profile_image?: string;
  tier: string;
  credits: number;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export const auth = {
  getMe: (token: string) =>
    request<User>("/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    }),

  // Development only
  devCreateUser: (xUserId: string, xUsername: string) =>
    request<TokenResponse>(
      `/api/auth/dev/create-user?x_user_id=${xUserId}&x_username=${xUsername}`,
      { method: "POST" }
    ),
};

export default {
  projects,
  builds,
  auth,
};

