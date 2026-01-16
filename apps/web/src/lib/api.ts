const API_URL = typeof window !== "undefined" && window.location.hostname !== "localhost"
  ? "https://heyclaude-api-production.up.railway.app"
  : (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000");

export interface Project {
  id: number;
  slug: string;
  name: string;
  prompt: string;
  status: string;
  html_content?: string;
  css_content?: string;
  js_content?: string;
  deployment_url?: string;
  created_at: string;
  updated_at: string;
  view_count?: number;
  twitter_author?: string;
}

export interface CreateProjectResponse {
  slug: string;
  name: string;
  status: string;
  message: string;
}

export interface RefineResponse {
  status: string;
  message: string;
}

export async function createProject(prompt: string): Promise<CreateProjectResponse> {
  const res = await fetch(`${API_URL}/api/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Failed to create project" }));
    throw new Error(error.detail || "Failed to create project");
  }
  return res.json();
}

export async function fetchProject(slug: string): Promise<Project> {
  const res = await fetch(`${API_URL}/api/projects/${slug}`);
  if (!res.ok) {
    throw new Error("Project not found");
  }
  return res.json();
}

export async function fetchProjects(): Promise<Project[]> {
  const res = await fetch(`${API_URL}/api/projects?limit=50`);
  if (!res.ok) {
    throw new Error("Failed to fetch projects");
  }
  return res.json();
}

export async function refineProject(slug: string, instruction: string): Promise<RefineResponse> {
  const res = await fetch(`${API_URL}/api/projects/${slug}/refine`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ instruction }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Failed to refine project" }));
    throw new Error(error.detail || "Failed to refine project");
  }
  return res.json();
}

// Poll for project status
export async function pollProjectStatus(
  slug: string,
  onUpdate: (project: Project) => void,
  interval: number = 2000,
  maxAttempts: number = 60
): Promise<Project> {
  let attempts = 0;
  
  return new Promise((resolve, reject) => {
    const poll = async () => {
      try {
        const project = await fetchProject(slug);
        onUpdate(project);
        
        if (project.status === 'completed' || project.status === 'error') {
          resolve(project);
          return;
        }
        
        attempts++;
        if (attempts >= maxAttempts) {
          reject(new Error('Build timeout'));
          return;
        }
        
        setTimeout(poll, interval);
      } catch (error) {
        reject(error);
      }
    };
    
    poll();
  });
}

export { API_URL };
