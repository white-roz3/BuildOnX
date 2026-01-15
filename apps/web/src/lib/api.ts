const API_URL = typeof window !== "undefined" && window.location.hostname !== "localhost"
  ? "https://heyclaude-api-production.up.railway.app"
  : (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000");

export async function fetchProject(slug: string) {
  const res = await fetch(`${API_URL}/api/projects/${slug}`);
  if (!res.ok) {
    throw new Error("Project not found");
  }
  return res.json();
}

export async function fetchProjects() {
  const res = await fetch(`${API_URL}/api/projects?limit=50`);
  if (!res.ok) {
    throw new Error("Failed to fetch projects");
  }
  return res.json();
}

export async function refineProject(slug: string, instruction: string) {
  const res = await fetch(`${API_URL}/api/projects/${slug}/refine`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ instruction }),
  });
  if (!res.ok) {
    throw new Error("Failed to refine project");
  }
  return res.json();
}

export { API_URL };

