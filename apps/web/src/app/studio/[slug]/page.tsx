'use client';

import { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { fetchProject, refineProject, pollProjectStatus, Project, API_URL } from '@/lib/api';
import { 
  ExternalLink, Share2, ChevronRight, RefreshCw, Maximize2,
  ImageIcon, MoreHorizontal, Check, Loader2, FileCode, Copy, Twitter
} from 'lucide-react';

interface PageProps {
  params: Promise<{ slug: string }>;
}

interface BuildStep {
  id: string;
  type: 'message' | 'task' | 'success' | 'error';
  content: string;
  status: 'pending' | 'running' | 'complete' | 'error';
  toolsUsed?: number;
}

export default function StudioPage({ params }: PageProps) {
  const { slug } = use(params);
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefining, setIsRefining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [buildSteps, setBuildSteps] = useState<BuildStep[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [isBuilding, setIsBuilding] = useState(false);
  const [replyPrompt, setReplyPrompt] = useState('');
  const [iframeKey, setIframeKey] = useState(0);

  const files = project ? getProjectFiles(project) : [];

  useEffect(() => {
    let cancelled = false;

    const loadProject = async () => {
      try {
        const data = await fetchProject(slug);
        if (cancelled) return;

        setProject(data);
        setIsLoading(false);

        addBuildStep({
          type: 'message',
          content: `Building: ${data.name || data.prompt}`,
          status: 'complete',
        });

        if (data.status === 'pending' || data.status === 'processing') {
          setIsBuilding(true);
          addBuildStep({
            type: 'task',
            content: 'Generating application code',
            status: 'running',
          });

          pollProjectStatus(slug, (updated) => {
            if (cancelled) return;
            setProject(updated);

            if (updated.status === 'completed') {
              setIsBuilding(false);
              updateLastBuildStep('complete', 3);
              addBuildStep({
                type: 'success',
                content: 'Build complete! Your app is live.',
                status: 'complete',
              });
            } else if (updated.status === 'error') {
              setIsBuilding(false);
              updateLastBuildStep('error');
              addBuildStep({
                type: 'error',
                content: 'Build failed.',
                status: 'error',
              });
            }
          }).catch((err) => {
            if (!cancelled) {
              setIsBuilding(false);
              setError(err.message);
            }
          });
        } else if (data.status === 'completed') {
          addBuildStep({
            type: 'task',
            content: 'Generated application files',
            status: 'complete',
            toolsUsed: 3,
          });
          addBuildStep({
            type: 'success',
            content: 'Your app is live!',
            status: 'complete',
          });
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load project');
          setIsLoading(false);
        }
      }
    };

    loadProject();
    return () => { cancelled = true; };
  }, [slug]);

  const addBuildStep = useCallback((step: Omit<BuildStep, 'id'>) => {
    setBuildSteps((prev) => [
      ...prev,
      { ...step, id: `step-${Date.now()}-${Math.random()}` },
    ]);
  }, []);

  const updateLastBuildStep = useCallback((status: BuildStep['status'], toolsUsed?: number) => {
    setBuildSteps((prev) => {
      const updated = [...prev];
      if (updated.length > 0) {
        updated[updated.length - 1] = { ...updated[updated.length - 1], status, toolsUsed };
      }
      return updated;
    });
  }, []);

  const handleRefine = async () => {
    if (!project || !replyPrompt.trim()) return;

    setIsRefining(true);
    setIsBuilding(true);

    addBuildStep({
      type: 'message',
      content: `Refining: "${replyPrompt}"`,
      status: 'complete',
    });
    addBuildStep({
      type: 'task',
      content: 'Applying changes',
      status: 'running',
    });

    try {
      await refineProject(slug, replyPrompt);
      setReplyPrompt('');

      await pollProjectStatus(slug, (updated) => {
        setProject(updated);

        if (updated.status === 'completed') {
          setIsBuilding(false);
          setIsRefining(false);
          updateLastBuildStep('complete', 2);
          addBuildStep({
            type: 'success',
            content: 'Changes applied!',
            status: 'complete',
          });
          setIframeKey(k => k + 1);
        } else if (updated.status === 'error') {
          setIsBuilding(false);
          setIsRefining(false);
          updateLastBuildStep('error');
        }
      });
    } catch (err) {
      setIsRefining(false);
      setIsBuilding(false);
      updateLastBuildStep('error');
    }
  };

  const previewUrl = project?.deployment_url || (project?.status === 'completed' ? `${API_URL}/api/projects/${slug}/preview` : undefined);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg-main flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-text-secondary text-sm">Loading project...</p>
        </div>
      </div>
    );
  }

  if (error && !project) {
    return (
      <div className="min-h-screen bg-bg-main flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-status-error">{error}</p>
          <Link href="/" className="text-sm text-accent hover:underline">← Back to Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen h-screen flex flex-col bg-bg-main">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/claude-symbol.svg"
              alt="HeyClaude"
              width={28}
              height={28}
              className="w-7 h-7"
            />
            <Image
              src="/heyclaude-text.png"
              alt="HEYCLAUDE"
              width={140}
              height={24}
              className="h-6 w-auto"
            />
            <span className="text-xl">👋</span>
          </Link>
          <span className="text-text-muted">/</span>
          <span className="font-mono text-sm text-text-secondary">{slug}</span>
        </div>
        
        <div className="flex items-center gap-3">
          {previewUrl && (
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white
                       bg-accent hover:bg-accent-hover rounded-lg transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Deploy
            </a>
          )}
          <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-text-secondary
                           bg-bg-card border border-border rounded-lg hover:border-accent 
                           hover:text-text-primary transition-colors">
            <Share2 className="w-4 h-4" />
            Share
          </button>
          <a
            href="https://twitter.com/buildheyclaude"
            target="_blank"
            rel="noopener noreferrer"
            className="text-text-secondary hover:text-text-primary transition-colors"
          >
            <Twitter className="w-5 h-5" />
          </a>
        </div>
      </header>

      {/* Split View */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Preview */}
        <div className="w-1/2 border-r border-border-subtle flex flex-col bg-bg-card">
          <div className="px-4 py-2 border-b border-border-subtle flex items-center justify-between">
            <span className="text-text-secondary text-sm font-medium">Preview</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setIframeKey(k => k + 1)} 
                      className="p-1.5 text-text-muted hover:text-text-primary transition-colors">
                <RefreshCw className="w-4 h-4" />
              </button>
              {previewUrl && (
                <a href={previewUrl} target="_blank" rel="noopener noreferrer" 
                   className="p-1.5 text-text-muted hover:text-text-primary transition-colors">
                  <Maximize2 className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
          
          <div className="flex-1 bg-white relative">
            {isBuilding && !previewUrl ? (
              <div className="absolute inset-0 flex items-center justify-center bg-bg-main">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm text-text-secondary">Building your app...</span>
                </div>
              </div>
            ) : previewUrl ? (
              <iframe key={iframeKey} src={previewUrl} className="w-full h-full border-0" title="Preview" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-bg-main">
                <p className="text-text-muted text-sm">No preview available</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Build Terminal */}
        <div className="w-1/2 flex flex-col bg-bg-main">
          {/* Terminal Header */}
          <div className="px-4 py-2 border-b border-border-subtle flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ChevronRight className="w-4 h-4 text-accent" />
              <span className="text-text-secondary font-mono text-sm">build_output</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-border" />
              <span className="w-2.5 h-2.5 rounded-full bg-border" />
              <span className={`w-2.5 h-2.5 rounded-full ${isBuilding ? 'bg-accent animate-pulse' : 'bg-status-live'}`} />
            </div>
          </div>

          {/* Build Steps */}
          <div className="flex-1 overflow-y-auto p-4 font-mono text-sm space-y-3">
            {buildSteps.map((step) => (
              <BuildStepItem key={step.id} step={step} />
            ))}
            {isBuilding && (
              <div className="flex items-center gap-2 text-accent">
                <span className="animate-spin">✳</span>
                <span>Manifesting...</span>
              </div>
            )}
          </div>

          {/* Reply Input */}
          <div className="p-4 border-t border-border-subtle">
            <div className="bg-bg-card rounded-lg border border-border overflow-hidden focus-within:border-accent transition-colors">
              <textarea
                value={replyPrompt}
                onChange={(e) => setReplyPrompt(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleRefine(); }}}
                placeholder="Reply or refine..."
                disabled={isRefining}
                rows={2}
                className="w-full bg-transparent text-text-primary placeholder-text-muted p-3 
                         resize-none focus:outline-none text-sm"
              />
              <div className="flex items-center justify-between px-3 py-2 border-t border-border-subtle">
                <div className="flex items-center gap-2">
                  <button className="p-1.5 text-text-muted hover:text-text-secondary transition-colors">
                    <ImageIcon className="w-4 h-4" />
                  </button>
                  <button className="p-1.5 text-text-muted hover:text-text-secondary transition-colors">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>
                <button
                  onClick={handleRefine}
                  disabled={!replyPrompt.trim() || isRefining}
                  className="bg-accent hover:bg-accent-hover text-white font-semibold 
                           px-4 py-1.5 rounded-lg flex items-center gap-2 text-sm transition-colors
                           disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Ask <span>✳</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* File Tabs */}
      {files.length > 0 && (
        <div className="px-4 py-2 border-t border-border-subtle flex items-center gap-2 bg-bg-card">
          <span className="text-text-muted text-sm mr-2">Files:</span>
          {files.map((file) => (
            <button
              key={file}
              onClick={() => setSelectedFile(selectedFile === file ? null : file)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono transition-colors ${
                selectedFile === file 
                  ? 'bg-accent text-white' 
                  : 'bg-bg-hover text-text-secondary hover:text-text-primary'
              }`}
            >
              <FileCode className="w-3 h-3" />
              {file}
            </button>
          ))}
          <div className="flex-1" />
          <span className="text-text-muted text-xs">{files.length} files</span>
        </div>
      )}

      {/* Code Viewer Modal */}
      {selectedFile && project && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-8 bg-bg-main/90 backdrop-blur-sm">
          <div className="w-full max-w-4xl h-[80vh] bg-bg-card rounded-xl border border-border flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
              <span className="font-mono text-sm text-text-primary">{selectedFile}</span>
              <button onClick={() => setSelectedFile(null)} className="text-text-muted hover:text-text-primary">✕</button>
            </div>
            <pre className="flex-1 overflow-auto p-4 text-xs font-mono text-text-secondary leading-relaxed">
              {getFileContent(project, selectedFile)}
            </pre>
            <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border-subtle">
              <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-text-secondary 
                               bg-bg-hover rounded hover:text-text-primary transition-colors">
                <Copy className="w-3.5 h-3.5" /> Copy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BuildStepItem({ step }: { step: BuildStep }) {
  if (step.type === 'message') {
    return (
      <div className="flex items-start gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-status-live mt-2 flex-shrink-0" />
        <span className="text-text-secondary leading-relaxed">{step.content}</span>
      </div>
    );
  }
  if (step.type === 'task') {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-start gap-2">
          {step.status === 'running' ? (
            <Loader2 className="w-4 h-4 text-accent animate-spin flex-shrink-0" />
          ) : (
            <span className="w-1.5 h-1.5 rounded-full bg-status-live mt-2 flex-shrink-0" />
          )}
          <span className="text-accent font-medium">Task: {step.content}</span>
        </div>
        {step.toolsUsed && step.status === 'complete' && (
          <span className="text-text-muted text-xs ml-6">└ Used {step.toolsUsed} tools</span>
        )}
      </div>
    );
  }
  if (step.type === 'success') {
    return (
      <div className="flex items-center gap-2 text-status-live">
        <Check className="w-4 h-4" />
        <span className="font-medium">{step.content}</span>
      </div>
    );
  }
  if (step.type === 'error') {
    return (
      <div className="flex items-center gap-2 text-status-error">
        <span>✕</span>
        <span>{step.content}</span>
      </div>
    );
  }
  return null;
}

function getProjectFiles(project: Project): string[] {
  const files: string[] = [];
  if (project.html_content) files.push('index.html');
  if (project.css_content) files.push('style.css');
  if (project.js_content) files.push('script.js');
  return files;
}

function getFileContent(project: Project, filename: string): string {
  switch (filename) {
    case 'index.html': return project.html_content || '';
    case 'style.css': return project.css_content || '';
    case 'script.js': return project.js_content || '';
    default: return '';
  }
}
