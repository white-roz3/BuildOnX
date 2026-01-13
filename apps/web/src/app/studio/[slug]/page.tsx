"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Zap,
  Save,
  Play,
  ExternalLink,
  RefreshCw,
  Send,
  Loader2,
  FileCode,
  ChevronRight,
  Copy,
  Check,
  Sparkles,
} from "lucide-react";

// Dynamically import Monaco to avoid SSR issues
const Editor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

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
}

export default function StudioPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [project, setProject] = useState<Project | null>(null);
  const [files, setFiles] = useState<Record<string, string>>({});
  const [activeFile, setActiveFile] = useState<string>("index.html");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // AI Chat state
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<
    Array<{ role: "user" | "assistant"; content: string }>
  >([]);
  const [refining, setRefining] = useState(false);

  // Copy state
  const [copied, setCopied] = useState(false);

  // Fetch project
  useEffect(() => {
    async function fetchProject() {
      try {
        const res = await fetch(`/api/projects/${slug}`);
        if (!res.ok) throw new Error("Project not found");
        const data = await res.json();
        setProject(data);
        setFiles(data.files || {});
        setActiveFile(data.entry_point || Object.keys(data.files)[0] || "index.html");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load project");
      } finally {
        setLoading(false);
      }
    }
    fetchProject();
  }, [slug]);

  // Save project
  const handleSave = async () => {
    if (!project) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files }),
      });
      if (!res.ok) throw new Error("Failed to save");
      const updated = await res.json();
      setProject(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  // Refine with AI
  const handleRefine = async () => {
    if (!chatInput.trim() || !project) return;

    const userMessage = chatInput.trim();
    setChatHistory((prev) => [...prev, { role: "user", content: userMessage }]);
    setChatInput("");
    setRefining(true);

    try {
      const res = await fetch(`/api/projects/${slug}/refine`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instruction: userMessage,
          current_files: files,
        }),
      });

      if (!res.ok) throw new Error("Refinement failed");

      const updated = await res.json();
      setFiles(updated.files);
      setProject(updated);
      setChatHistory((prev) => [
        ...prev,
        { role: "assistant", content: "✨ Updated your project! Check the preview." },
      ]);
    } catch (err) {
      setChatHistory((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `❌ ${err instanceof Error ? err.message : "Something went wrong"}`,
        },
      ]);
    } finally {
      setRefining(false);
    }
  };

  // Generate preview HTML
  const generatePreview = useCallback(() => {
    if (!files["index.html"]) {
      return `<!DOCTYPE html>
<html>
<head><style>body{background:#111;color:#888;font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}</style></head>
<body>No preview available</body>
</html>`;
    }

    // For simple static sites, return the HTML directly
    // CSS and JS should be inline or referenced
    return files["index.html"];
  }, [files]);

  // Copy URL
  const copyUrl = () => {
    if (project?.deployment_url) {
      navigator.clipboard.writeText(project.deployment_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Get file language for Monaco
  const getLanguage = (filename: string) => {
    const ext = filename.split(".").pop();
    const map: Record<string, string> = {
      html: "html",
      css: "css",
      js: "javascript",
      ts: "typescript",
      json: "json",
      py: "python",
      md: "markdown",
    };
    return map[ext || ""] || "plaintext";
  };

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

  return (
    <div className="h-screen bg-dark-950 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="h-14 border-b border-dark-800 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-primary-500 rounded flex items-center justify-center">
              <Zap className="w-4 h-4 text-dark-950" />
            </div>
            <span className="font-bold text-sm">BuildOnX</span>
          </Link>
          <ChevronRight className="w-4 h-4 text-dark-600" />
          <span className="font-medium truncate max-w-[200px]">{project.name}</span>
          {project.deployment_status === "live" && (
            <span className="px-2 py-0.5 bg-primary-500/20 text-primary-500 text-xs rounded-full">
              Live
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Copy URL */}
          <button
            onClick={copyUrl}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-dark-400 hover:text-white transition"
          >
            {copied ? (
              <Check className="w-4 h-4 text-primary-500" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
            {copied ? "Copied!" : "Copy URL"}
          </button>

          {/* View Live */}
          <a
            href={project.deployment_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-dark-400 hover:text-white transition"
          >
            <ExternalLink className="w-4 h-4" />
            View Live
          </a>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-primary-500 text-dark-950 px-4 py-1.5 text-sm font-medium hover:bg-primary-400 disabled:opacity-50 transition"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? "Deploying..." : "Save & Deploy"}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* File Sidebar */}
        <div className="w-48 border-r border-dark-800 flex flex-col shrink-0">
          <div className="p-3 border-b border-dark-800">
            <span className="text-xs text-dark-500 uppercase tracking-wider">Files</span>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {Object.keys(files).map((filename) => (
              <button
                key={filename}
                onClick={() => setActiveFile(filename)}
                className={`w-full text-left px-3 py-2 text-sm rounded flex items-center gap-2 transition ${
                  activeFile === filename
                    ? "bg-dark-800 text-white"
                    : "text-dark-400 hover:text-white hover:bg-dark-800/50"
                }`}
              >
                <FileCode className="w-4 h-4 shrink-0" />
                <span className="truncate">{filename}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Editor + Preview */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 flex min-h-0">
            {/* Code Editor */}
            <div className="flex-1 flex flex-col min-w-0 border-r border-dark-800">
              <div className="h-10 border-b border-dark-800 px-4 flex items-center">
                <span className="text-sm text-dark-400 font-mono">{activeFile}</span>
              </div>
              <div className="flex-1">
                <Editor
                  height="100%"
                  language={getLanguage(activeFile)}
                  theme="vs-dark"
                  value={files[activeFile] || ""}
                  onChange={(value) =>
                    setFiles((prev) => ({ ...prev, [activeFile]: value || "" }))
                  }
                  options={{
                    minimap: { enabled: false },
                    fontSize: 13,
                    fontFamily: "var(--font-mono), monospace",
                    padding: { top: 16, bottom: 16 },
                    scrollBeyondLastLine: false,
                    wordWrap: "on",
                    tabSize: 2,
                    lineNumbers: "on",
                    renderLineHighlight: "line",
                    cursorBlinking: "smooth",
                  }}
                />
              </div>
            </div>

            {/* Preview */}
            <div className="w-[45%] flex flex-col shrink-0">
              <div className="h-10 border-b border-dark-800 px-4 flex items-center justify-between">
                <span className="text-sm text-dark-400">Preview</span>
                <button
                  onClick={() => {
                    // Force iframe refresh
                    const iframe = document.querySelector("iframe");
                    if (iframe) {
                      iframe.srcdoc = generatePreview();
                    }
                  }}
                  className="p-1 text-dark-500 hover:text-white transition"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 bg-white">
                <iframe
                  srcDoc={generatePreview()}
                  className="w-full h-full border-0"
                  sandbox="allow-scripts allow-same-origin"
                  title="Preview"
                />
              </div>
            </div>
          </div>

          {/* AI Chat Panel */}
          <div className="h-48 border-t border-dark-800 flex flex-col shrink-0">
            <div className="h-10 border-b border-dark-800 px-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary-500" />
              <span className="text-sm font-medium">AI Assistant</span>
            </div>
            
            {/* Chat History */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {chatHistory.length === 0 && (
                <p className="text-sm text-dark-500">
                  Describe what changes you want to make...
                </p>
              )}
              {chatHistory.map((msg, i) => (
                <div
                  key={i}
                  className={`text-sm ${
                    msg.role === "user" ? "text-dark-300" : "text-primary-500"
                  }`}
                >
                  <span className="text-dark-600">{msg.role === "user" ? "> " : "← "}</span>
                  {msg.content}
                </div>
              ))}
              {refining && (
                <div className="text-sm text-primary-500 flex items-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Generating changes...
                </div>
              )}
            </div>

            {/* Chat Input */}
            <div className="p-3 border-t border-dark-800">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleRefine()}
                  placeholder="e.g., 'make the header sticky' or 'add a footer with social links'"
                  disabled={refining}
                  className="flex-1 bg-dark-900 border border-dark-700 px-4 py-2 text-sm placeholder:text-dark-600 focus:border-primary-500 focus:outline-none disabled:opacity-50"
                />
                <button
                  onClick={handleRefine}
                  disabled={refining || !chatInput.trim()}
                  className="bg-dark-800 hover:bg-dark-700 disabled:opacity-50 px-4 py-2 transition flex items-center gap-2"
                >
                  {refining ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

