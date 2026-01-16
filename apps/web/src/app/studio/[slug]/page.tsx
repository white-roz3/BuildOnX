'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { fetchProject, refineProject, pollProjectStatus, Project, API_URL } from '@/lib/api';
import { 
  ExternalLink, RefreshCw, Send, Code, Eye, 
  FileCode, Copy, Check, MessageSquare
} from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isLoading?: boolean;
}

export default function StudioPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
  const [activeCodeFile, setActiveCodeFile] = useState<string>('index.html');
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [copied, setCopied] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;

    const loadProject = async () => {
      try {
        const data = await fetchProject(slug);
        if (cancelled) return;
        setProject(data);
        setIsLoading(false);

        const isLive = ['live', 'completed', 'deployed'].includes(data.status);
        const isBuilding = ['building', 'pending', 'processing', 'generating', 'saving'].includes(data.status);

        if (isLive) {
          setMessages([{
            id: 'welcome',
            role: 'assistant',
            content: `"${data.name || 'Your app'}" is ready! Ask me to make changes.`,
          }]);
        } else if (isBuilding) {
          setIsProcessing(true);
          setMessages([{
            id: 'building',
            role: 'assistant',
            content: 'Building...',
            isLoading: true,
          }]);

          pollProjectStatus(slug, (updated) => {
            if (cancelled) return;
            setProject(updated);
            if (['completed', 'live', 'deployed'].includes(updated.status)) {
              setIsProcessing(false);
              setMessages([{
                id: 'done',
                role: 'assistant',
                content: `Done! "${updated.name || 'Your app'}" is live.`,
              }]);
              setIframeKey(k => k + 1);
            }
          }).catch(() => setIsProcessing(false));
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load');
          setIsLoading(false);
        }
      }
    };

    loadProject();
    return () => { cancelled = true; };
  }, [slug]);

  const handleSend = async () => {
    if (!chatInput.trim() || isProcessing) return;

    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', content: chatInput };
    const loadingMsg: ChatMessage = { id: `l-${Date.now()}`, role: 'assistant', content: 'Working...', isLoading: true };

    setMessages(prev => [...prev, userMsg, loadingMsg]);
    setChatInput('');
    setIsProcessing(true);

    try {
      await refineProject(slug, chatInput);
      await pollProjectStatus(slug, (updated) => {
        setProject(updated);
        if (['completed', 'live', 'deployed'].includes(updated.status)) {
          setIsProcessing(false);
          setMessages(prev => [
            ...prev.filter(m => !m.isLoading),
            { id: `d-${Date.now()}`, role: 'assistant', content: 'Done! Check the preview.' }
          ]);
          setIframeKey(k => k + 1);
        }
      });
    } catch {
      setIsProcessing(false);
      setMessages(prev => [
        ...prev.filter(m => !m.isLoading),
        { id: `e-${Date.now()}`, role: 'assistant', content: 'Something went wrong.' }
      ]);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(getFileContent(project, activeCodeFile));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const previewUrl = ['live', 'completed', 'deployed'].includes(project?.status || '')
    ? `${API_URL}/api/projects/${slug}/preview`
    : undefined;

  const files = project ? getProjectFiles(project) : [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg-main flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error && !project) {
    return (
      <div className="min-h-screen bg-bg-main flex items-center justify-center">
        <div className="text-center">
          <p className="text-status-error mb-4">{error}</p>
          <Link href="/" className="text-accent hover:underline">← Back</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen h-screen flex flex-col bg-bg-main">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-bg-card border-b border-border">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/claude-symbol.svg" alt="HeyClaude" width={28} height={28} />
            <Image src="/heyclaude-text.png" alt="HEYCLAUDE" width={120} height={24} className="h-6 w-auto" />
            <span className="text-lg">👋</span>
          </Link>
          <span className="text-text-muted">/</span>
          <span className="text-sm text-text-secondary font-mono truncate max-w-[200px]">
            {project?.name || slug}
          </span>
        </div>
        
        {previewUrl && (
          <a
            href={previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white
                     bg-accent hover:bg-accent-hover rounded-lg transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Open
          </a>
        )}
      </header>

      {/* Main */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Preview/Code */}
        <div className="flex-1 flex flex-col bg-bg-card border-r border-border">
          {/* Tabs */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('preview')}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === 'preview' ? 'bg-accent text-white' : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
                }`}
              >
                <Eye className="w-4 h-4" /> Preview
              </button>
              <button
                onClick={() => setActiveTab('code')}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === 'code' ? 'bg-accent text-white' : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
                }`}
              >
                <Code className="w-4 h-4" /> Code
              </button>
            </div>
            
            <div className="flex items-center gap-2">
              {activeTab === 'preview' && (
                <button onClick={() => setIframeKey(k => k + 1)} className="p-2 text-text-muted hover:text-text-primary">
                  <RefreshCw className="w-4 h-4" />
                </button>
              )}
              {activeTab === 'code' && (
                <button onClick={copyCode} className="flex items-center gap-1 px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary">
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 relative">
            {activeTab === 'preview' ? (
              isProcessing && !previewUrl ? (
                <div className="absolute inset-0 flex items-center justify-center bg-bg-main">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm text-text-secondary">Building...</span>
                  </div>
                </div>
              ) : previewUrl ? (
                <iframe key={iframeKey} src={previewUrl} className="w-full h-full border-0 bg-white" title="Preview" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-bg-main">
                  <p className="text-text-muted">No preview yet</p>
                </div>
              )
            ) : (
              <div className="h-full flex flex-col">
                {files.length > 0 && (
                  <div className="flex items-center gap-1 px-4 py-2 border-b border-border bg-bg-main">
                    {files.map((file) => (
                      <button
                        key={file}
                        onClick={() => setActiveCodeFile(file)}
                        className={`flex items-center gap-1 px-3 py-1.5 text-xs font-mono rounded-lg transition-colors ${
                          activeCodeFile === file ? 'bg-accent text-white' : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
                        }`}
                      >
                        <FileCode className="w-3 h-3" /> {file}
                      </button>
                    ))}
                  </div>
                )}
                <pre className="flex-1 overflow-auto p-4 text-sm font-mono text-text-secondary bg-bg-main leading-relaxed">
                  <code>{getFileContent(project, activeCodeFile) || '// No content'}</code>
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* Right: Chat */}
        <div className="w-[380px] flex flex-col bg-bg-card">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
            <MessageSquare className="w-4 h-4 text-accent" />
            <span className="text-sm font-semibold text-text-primary">Chat</span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm ${
                  msg.role === 'user'
                    ? 'bg-accent text-white rounded-br-md'
                    : 'bg-bg-hover text-text-primary rounded-bl-md'
                }`}>
                  {msg.isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                      <span className="text-text-muted">{msg.content}</span>
                    </div>
                  ) : msg.content}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          <div className="p-4 border-t border-border">
            <div className="flex items-end gap-2 bg-bg-main rounded-xl p-2 border border-border focus-within:border-accent">
              <textarea
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }}}
                placeholder="Ask for changes..."
                disabled={isProcessing}
                rows={1}
                className="flex-1 bg-transparent text-text-primary placeholder-text-muted px-2 py-1.5 resize-none focus:outline-none text-sm"
              />
              <button
                onClick={handleSend}
                disabled={!chatInput.trim() || isProcessing}
                className="p-2 bg-accent hover:bg-accent-hover text-white rounded-lg transition-colors disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function getProjectFiles(project: Project | null): string[] {
  if (!project) return [];
  if (project.files) return Object.keys(project.files);
  const files: string[] = [];
  if (project.html_content) files.push('index.html');
  if (project.css_content) files.push('style.css');
  if (project.js_content) files.push('script.js');
  return files;
}

function getFileContent(project: Project | null, filename: string): string {
  if (!project) return '';
  if (project.files?.[filename]) return project.files[filename];
  switch (filename) {
    case 'index.html': return project.html_content || '';
    case 'style.css': return project.css_content || '';
    case 'script.js': return project.js_content || '';
    default: return '';
  }
}
