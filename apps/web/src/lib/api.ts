// Always use production API - Railway handles the deployment
const API_URL = typeof window !== "undefined" 
  ? (process.env.NEXT_PUBLIC_API_URL || "https://heyclaude-api-production.up.railway.app")
  : "https://heyclaude-api-production.up.railway.app";

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
  id: string;
  slug: string;
  name: string;
  status: string;
  deployment_status?: string;
  deployment_url?: string;
  message?: string;
}

export interface RefineResponse {
  status: string;
  message: string;
}

export async function createProject(prompt: string): Promise<CreateProjectResponse> {
  const url = `${API_URL}/api/projects`;
  console.log('Creating project:', url, { prompt });
  
  // Create an AbortController for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout
  
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!res.ok) {
      const error = await res.json().catch(() => ({ 
        detail: `HTTP ${res.status}: ${res.statusText}` 
      }));
      throw new Error(error.detail || error.message || `Failed to create project (${res.status})`);
    }
    
    const data = await res.json();
    console.log('Project created:', data);
    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timeout - The build is taking longer than expected. Please check the studio page for status.');
    }
    
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error(`Cannot connect to API at ${API_URL}. Please check if the API service is running.`);
    }
    
    throw error;
  }
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
