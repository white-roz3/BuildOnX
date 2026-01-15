"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { fetchProject, refineProject } from "@/lib/api";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

export default function StudioPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeFile, setActiveFile] = useState<string>("index.html");
  const [activeTab, setActiveTab] = useState<"code" | "preview">("code");
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [refining, setRefining] = useState(false);
  const [showChat, setShowChat] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchProject(slug);
        setProject(data);
        if (data.files && Object.keys(data.files).length > 0) {
          setActiveFile(Object.keys(data.files)[0]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    if (slug) load();
  }, [slug]);

  useEffect(() => {
    if (!project) return;
    const interval = setInterval(async () => {
      try {
        const data = await fetchProject(slug);
        if (JSON.stringify(data.files) !== JSON.stringify(project.files)) {
          setProject(data);
        }
      } catch (err) {
        console.error(err);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [slug, project]);

  const handleRefine = async () => {
    if (!chatInput.trim() || refining) return;
    setRefining(true);
    const userMessage = chatInput;
    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setChatMessages((prev) => [...prev, { role: "assistant", content: "Working on it..." }]);

    try {
      await refineProject(slug, userMessage);
      const updated = await fetchProject(slug);
      setProject(updated);
      setChatMessages((prev) => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = { role: "assistant", content: "Done! Your project has been updated." };
        return newMessages;
      });
    } catch (err: any) {
      setChatMessages((prev) => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = { role: "assistant", content: `Error: ${err.message}` };
        return newMessages;
      });
    } finally {
      setRefining(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen bg-claude-bg flex items-center justify-center">
        <div className="text-claude-text-secondary">Loading...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="h-screen bg-claude-bg flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-claude-text mb-4">Project not found</h1>
          <Link href="/" className="text-claude-orange hover:text-claude-orange-light transition-colors">
            Go home
          </Link>
        </div>
      </div>
    );
  }

  const files = project.files || {};
  const currentFileContent = files[activeFile] || "";

  return (
    <div className="h-screen flex flex-col bg-claude-bg text-claude-text overflow-hidden">
      {/* Top Bar */}
      <header className="h-12 border-b border-claude-border bg-claude-surface flex items-center px-4 shrink-0">
        <Link href="/" className="flex items-center gap-2 mr-6">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-claude-orange">
            <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" fill="currentColor"/>
          </svg>
          <span className="text-claude-text font-medium">HeyClaude</span>
        </Link>
        <div className="flex-1 text-sm text-claude-text-secondary truncate">{project.name || "Untitled"}</div>
        <div className="flex items-center gap-2">
          <Link
            href={`/p/${slug}`}
            className="px-3 py-1.5 text-sm text-claude-text-secondary hover:text-claude-text transition-colors"
          >
            View Project
          </Link>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* File Sidebar */}
        <div className="w-48 border-r border-claude-border flex flex-col shrink-0 bg-claude-surface">
          <div className="px-3 py-2 border-b border-claude-border">
            <h3 className="text-xs font-medium text-claude-text-tertiary uppercase tracking-wide">Files</h3>
          </div>
          <div className="flex-1 overflow-y-auto py-1">
            {Object.keys(files).map((filename) => (
              <button
                key={filename}
                onClick={() => setActiveFile(filename)}
                className={`w-full text-left px-3 py-1.5 text-sm transition-colors ${
                  activeFile === filename
                    ? "bg-claude-surface-elevated text-claude-orange"
                    : "text-claude-text-secondary hover:text-claude-text hover:bg-claude-surface-elevated"
                }`}
              >
                {filename}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Tab Bar */}
          <div className="h-10 border-b border-claude-border bg-claude-surface flex items-center px-2 shrink-0">
            <button
              onClick={() => setActiveTab("code")}
              className={`px-3 py-1.5 text-sm rounded transition-colors ${
                activeTab === "code"
                  ? "bg-claude-surface-elevated text-claude-text"
                  : "text-claude-text-secondary hover:text-claude-text"
              }`}
            >
              Code
            </button>
            <button
              onClick={() => setActiveTab("preview")}
              className={`px-3 py-1.5 text-sm rounded transition-colors ${
                activeTab === "preview"
                  ? "bg-claude-surface-elevated text-claude-text"
                  : "text-claude-text-secondary hover:text-claude-text"
              }`}
            >
              Preview
            </button>
            <div className="flex-1" />
            <button
              onClick={() => setShowChat(!showChat)}
              className={`px-3 py-1.5 text-sm rounded transition-colors ${
                showChat
                  ? "bg-claude-orange/20 text-claude-orange"
                  : "text-claude-text-secondary hover:text-claude-text"
              }`}
            >
              Chat
            </button>
          </div>

          {/* Editor / Preview Area */}
          <div className="flex-1 flex min-h-0">
            <div className="flex-1 min-w-0">
              {activeTab === "code" ? (
                <MonacoEditor
                  height="100%"
                  language={
                    activeFile.endsWith(".html") ? "html" :
                    activeFile.endsWith(".css") ? "css" :
                    activeFile.endsWith(".js") ? "javascript" : "plaintext"
                  }
                  value={currentFileContent}
                  theme="vs-dark"
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    lineNumbers: "on",
                    scrollBeyondLastLine: false,
                    padding: { top: 16, bottom: 16 },
                    fontFamily: "'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace",
                  }}
                />
              ) : (
                <div className="h-full bg-white">
                  {currentFileContent ? (
                    <iframe
                      srcDoc={files["index.html"] || currentFileContent}
                      className="w-full h-full border-0"
                      title="Preview"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-claude-text-tertiary">
                      No preview available
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Chat Panel */}
            {showChat && (
              <div className="w-80 border-l border-claude-border flex flex-col bg-claude-surface shrink-0">
                <div className="px-4 py-3 border-b border-claude-border">
                  <h3 className="text-sm font-medium text-claude-text">Ask Claude to edit</h3>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {chatMessages.length === 0 ? (
                    <p className="text-sm text-claude-text-tertiary">
                      Describe changes you want to make to your project.
                    </p>
                  ) : (
                    chatMessages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`text-sm ${
                          msg.role === "user"
                            ? "text-claude-text"
                            : "text-claude-text-secondary"
                        }`}
                      >
                        <span className={`font-medium ${msg.role === "user" ? "text-claude-orange" : "text-claude-text-tertiary"}`}>
                          {msg.role === "user" ? "You" : "Claude"}:
                        </span>{" "}
                        {msg.content}
                      </div>
                    ))
                  )}
                </div>
                <div className="p-3 border-t border-claude-border">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleRefine();
                    }}
                    className="flex flex-col gap-2"
                  >
                    <textarea
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Ask Claude to edit..."
                      rows={3}
                      className="w-full px-3 py-2 bg-claude-bg border border-claude-border rounded-lg text-sm text-claude-text placeholder-claude-text-tertiary focus:outline-none focus:border-claude-orange resize-none"
                      disabled={refining}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleRefine();
                        }
                      }}
                    />
                    <button
                      type="submit"
                      disabled={refining || !chatInput.trim()}
                      className="w-full px-4 py-2 bg-claude-orange text-claude-bg font-medium rounded-lg hover:bg-claude-orange-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                    >
                      {refining ? "Working..." : "Send"}
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
