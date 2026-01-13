"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Zap, ExternalLink, Edit, Code, GitFork, Eye, Calendar, Loader2 } from "lucide-react";

interface Project {
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

export default function ProjectPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCode, setShowCode] = useState(false);

  useEffect(() => {
    async function fetchProject() {
      try {
        const res = await fetch(`/api/projects/${slug}`);
        if (!res.ok) throw new Error("Project not found");
        const data = await res.json();
        setProject(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load project");
      } finally {
        setLoading(false);
      }
    }
    fetchProject();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="flex items-center gap-3 text-primary-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="font-mono">Loading project...</span>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-dark-950 flex flex-col items-center justify-center gap-4">
        <p className="text-red-500">{error || "Project not found"}</p>
        <Link href="/" className="text-primary-500 hover:underline">
          ← Back to home
        </Link>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-dark-950">
      {/* Header */}
      <header className="border-b border-dark-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-dark-950" />
            </div>
            <span className="font-bold text-lg">BuildOnX</span>
          </Link>

          <div className="flex items-center gap-4">
            <Link
              href={`/studio/${slug}`}
              className="flex items-center gap-2 px-4 py-2 border border-dark-700 hover:border-dark-500 transition"
            >
              <Edit className="w-4 h-4" />
              Edit in Studio
            </Link>
            <a
              href={project.deployment_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-primary-500 text-dark-950 px-4 py-2 font-medium hover:bg-primary-400 transition"
            >
              <ExternalLink className="w-4 h-4" />
              Open App
            </a>
          </div>
        </div>
      </header>

      {/* Project Info */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-3">{project.name}</h1>
          <p className="text-xl text-dark-400 mb-4">{project.description}</p>
          
          <div className="flex flex-wrap items-center gap-6 text-sm text-dark-500">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              {project.views} views
            </div>
            <div className="flex items-center gap-2">
              <GitFork className="w-4 h-4" />
              {project.forks} forks
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {formatDate(project.created_at)}
            </div>
          </div>
        </div>

        {/* Original Prompt */}
        <div className="mb-8 p-4 bg-dark-900 border border-dark-800 rounded-lg">
          <p className="text-sm text-dark-500 mb-2">Built from tweet:</p>
          <p className="text-dark-200 font-mono">
            @BuildAppsOnX {project.original_prompt}
          </p>
        </div>

        {/* Preview + Code Toggle */}
        <div className="flex gap-4 mb-4">
          <button
            onClick={() => setShowCode(false)}
            className={`px-4 py-2 text-sm font-medium transition ${
              !showCode
                ? "bg-primary-500 text-dark-950"
                : "text-dark-400 hover:text-white"
            }`}
          >
            Preview
          </button>
          <button
            onClick={() => setShowCode(true)}
            className={`px-4 py-2 text-sm font-medium transition flex items-center gap-2 ${
              showCode
                ? "bg-primary-500 text-dark-950"
                : "text-dark-400 hover:text-white"
            }`}
          >
            <Code className="w-4 h-4" />
            View Code
          </button>
        </div>

        {/* Content */}
        <div className="border border-dark-800 rounded-lg overflow-hidden">
          {showCode ? (
            <div className="max-h-[600px] overflow-auto">
              {Object.entries(project.files).map(([filename, content]) => (
                <div key={filename} className="border-b border-dark-800 last:border-b-0">
                  <div className="bg-dark-900 px-4 py-2 border-b border-dark-800 sticky top-0">
                    <span className="font-mono text-sm text-dark-300">{filename}</span>
                  </div>
                  <pre className="p-4 text-sm overflow-x-auto">
                    <code className="text-dark-300">{content}</code>
                  </pre>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white">
              <iframe
                src={project.deployment_url}
                className="w-full h-[600px] border-0"
                title={project.name}
              />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-8 flex gap-4">
          <button className="flex items-center gap-2 px-6 py-3 border border-dark-700 hover:border-primary-500 transition">
            <GitFork className="w-4 h-4" />
            Fork Project
          </button>
          <Link
            href={`/studio/${slug}`}
            className="flex items-center gap-2 px-6 py-3 bg-primary-500 text-dark-950 font-medium hover:bg-primary-400 transition"
          >
            <Edit className="w-4 h-4" />
            Remix in Studio
          </Link>
        </div>
      </div>
    </div>
  );
}

