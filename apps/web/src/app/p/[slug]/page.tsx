"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { fetchProject } from "@/lib/api";

export default function ProjectPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchProject(slug);
        setProject(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    if (slug) load();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-claude-bg flex items-center justify-center">
        <div className="text-claude-text-secondary">Loading...</div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-claude-bg flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-claude-text mb-4">Project not found</h1>
          <Link href="/" className="text-claude-orange hover:text-claude-orange-light transition-colors">
            Go home
          </Link>
        </div>
      </div>
    );
  }

  const htmlContent = project.files?.[project.entry_point || "index.html"] || "";

  return (
    <div className="min-h-screen bg-claude-bg flex flex-col">
      {/* Header */}
      <header className="w-full px-6 py-4 border-b border-claude-border">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-claude-orange">
              <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" fill="currentColor"/>
            </svg>
            <span className="text-claude-text font-semibold text-lg">HeyClaude</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href={`/studio/${slug}`}
              className="px-4 py-2 bg-claude-orange text-claude-bg font-medium rounded-lg hover:bg-claude-orange-light transition-colors text-sm"
            >
              Edit in Studio
            </Link>
            {project.deployment_url && (
              <a
                href={project.deployment_url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-claude-surface-elevated text-claude-text font-medium rounded-lg hover:bg-claude-border transition-colors text-sm border border-claude-border"
              >
                Open App ↗
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Project Info */}
      <div className="w-full px-6 py-6 border-b border-claude-border bg-claude-surface">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-semibold text-claude-text mb-1">{project.name || "Untitled"}</h1>
          {project.description && (
            <p className="text-claude-text-secondary">{project.description}</p>
          )}
        </div>
      </div>

      {/* Preview */}
      <main className="flex-1 bg-white">
        {htmlContent ? (
          <iframe
            srcDoc={htmlContent}
            className="w-full h-full min-h-[calc(100vh-200px)] border-0"
            title="Project Preview"
          />
        ) : project.deployment_url ? (
          <iframe
            src={project.deployment_url}
            className="w-full h-full min-h-[calc(100vh-200px)] border-0"
            title="Project Preview"
          />
        ) : (
          <div className="flex items-center justify-center h-full min-h-[calc(100vh-200px)] text-claude-text-tertiary">
            No preview available
          </div>
        )}
      </main>
    </div>
  );
}
