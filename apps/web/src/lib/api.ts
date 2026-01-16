// Production API URL - hardcoded for reliability
const API_URL = "https://heyclaude-api-production.up.railway.app";

export interface Project {
  id: string;
  slug: string;
  name: string;
  description?: string;
  prompt: string;              // Frontend alias for original_prompt
  original_prompt?: string;    // API field name
  status: string;              // Frontend alias for deployment_status  
  deployment_status?: string;  // API field name
  files?: Record<string, string>;
  entry_point?: string;
  html_content?: string;       // Extracted from files
  css_content?: string;        // Extracted from files
  js_content?: string;         // Extracted from files
  deployment_url?: string;
  created_at: string;
  updated_at?: string;
  view_count?: number;
  views?: number;              // API field name
  is_public?: boolean;
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

// Transform API response to frontend format
function transformProject(data: any): Project {
  const files = data.files || {};
  return {
    ...data,
    // Map API field names to frontend aliases
    prompt: data.original_prompt || data.prompt || '',
    status: data.deployment_status || data.status || 'pending',
    view_count: data.views ?? data.view_count ?? 0,
    // Extract files for backwards compatibility
    html_content: files['index.html'] || data.html_content,
    css_content: files['style.css'] || data.css_content,
    js_content: files['script.js'] || data.js_content,
  };
}

export async function fetchProject(slug: string): Promise<Project> {
  const res = await fetch(`${API_URL}/api/projects/${slug}`);
  if (!res.ok) {
    throw new Error("Project not found");
  }
  const data = await res.json();
  return transformProject(data);
}

export async function fetchProjects(): Promise<Project[]> {
  const res = await fetch(`${API_URL}/api/projects?limit=50`);
  if (!res.ok) {
    throw new Error("Failed to fetch projects");
  }
  const data = await res.json();
  // API returns { items: [...], total, page, per_page }
  const items = Array.isArray(data) ? data : (data.items || []);
  return items.map(transformProject);
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
  
  // Status values that indicate completion
  const completedStatuses = ['completed', 'live', 'deployed'];
  const errorStatuses = ['error', 'failed'];
  
  return new Promise((resolve, reject) => {
    const poll = async () => {
      try {
        const project = await fetchProject(slug);
        onUpdate(project);
        
        if (completedStatuses.includes(project.status) || errorStatuses.includes(project.status)) {
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
