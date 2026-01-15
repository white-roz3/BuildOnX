"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchProjects } from "@/lib/api";

export default function ExplorePage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchProjects();
        setProjects(data.items || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="min-h-screen bg-claude-bg">
      {/* Header */}
      <header className="w-full px-6 py-4 border-b border-claude-border">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-claude-orange">
              <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" fill="currentColor"/>
            </svg>
            <span className="text-claude-text font-semibold text-lg">HeyClaude</span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/explore" className="text-claude-text text-sm font-medium">
              Explore
            </Link>
            <Link href="/admin" className="text-claude-text-secondary hover:text-claude-text transition-colors text-sm">
              Admin
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-semibold text-claude-text mb-2">Explore Projects</h1>
        <p className="text-claude-text-secondary mb-8">Discover what others have built with HeyClaude</p>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-claude-text-secondary">Loading...</div>
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="text-claude-text-tertiary mb-4">No projects yet</div>
            <a
              href="https://x.com/buildheyclaude"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-claude-orange text-claude-bg font-medium rounded-lg hover:bg-claude-orange-light transition-colors text-sm"
            >
              Create the first one
            </a>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <Link
                key={project.slug}
                href={`/p/${project.slug}`}
                className="bg-claude-surface p-5 rounded-lg border border-claude-border hover:border-claude-orange/50 transition-colors group"
              >
                <h3 className="text-lg font-medium text-claude-text mb-2 group-hover:text-claude-orange transition-colors">
                  {project.name || "Untitled"}
                </h3>
                {project.description && (
                  <p className="text-claude-text-secondary text-sm mb-4 line-clamp-2">
                    {project.description}
                  </p>
                )}
                <div className="flex items-center gap-4 text-xs text-claude-text-tertiary">
                  <span>👁️ {project.views || 0}</span>
                  <span>🍴 {project.forks || 0}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
