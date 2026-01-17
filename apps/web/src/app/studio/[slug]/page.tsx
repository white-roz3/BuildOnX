'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { fetchProject, refineProject, pollProjectStatus, Project, API_URL } from '@/lib/api';
import { 
  ExternalLink, RefreshCw, Send, Code, Eye, 
  FileCode, Copy, Check, MessageSquare, GitFork, Download, Smartphone, Monitor
} from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isLoading?: boolean;
}

export default function StudioPage() {
  const params = useParams();
  const router = useRouter();
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
  const [mobileView, setMobileView] = useState(false);
  const [forking, setForking] = useState(false);
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
            content: `"${data.name || 'Your app'}" is ready. Ask me to make changes.`,
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
                content: `Done. "${updated.name || 'Your app'}" is live.`,
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
            { id: `d-${Date.now()}`, role: 'assistant', content: 'Done. Check the preview.' }
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

  const handleFork = async () => {
    if (forking) return;
    setForking(true);
    try {
      const res = await fetch(`${API_URL}/api/projects/${slug}/fork`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        router.push(`/studio/${data.slug}`);
      }
    } catch (e) {
      console.error(e);
    }
    setForking(false);
  };

  const handleDownload = async () => {
    try {
      const res = await fetch(`${API_URL}/api/projects/${slug}/download`);
      if (res.ok) {
        const data = await res.json();
        const files = data.files || {};
        
        // Create a simple HTML file with all content
        let content = '';
        Object.entries(files).forEach(([filename, fileContent]) => {
          content += `// ===== ${filename} =====\n${fileContent}\n\n`;
        });
        
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${slug}-source.txt`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const previewUrl = ['live', 'completed', 'deployed'].includes(project?.status || '')
    ? `${API_URL}/api/projects/${slug}/preview`
    : undefined;

  const files = project ? getProjectFiles(project) : [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#1c1917] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error && !project) {
    return (
      <div className="min-h-screen bg-[#1c1917] flex items-center justify-center text-stone-100">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <Link href="/" className="text-orange-500 hover:underline">Back</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen h-screen flex flex-col bg-[#1c1917] text-stone-100">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 bg-stone-900 border-b border-stone-800">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/claude-symbol.svg" alt="HeyClaude" width={24} height={24} />
            <Image src="/heyclaude-text.png" alt="HEYCLAUDE" width={100} height={20} className="h-5 w-auto" />
          </Link>
          <span className="text-stone-600">/</span>
          <span className="text-sm text-stone-400 font-mono truncate max-w-[200px]">
            {project?.name || slug}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleFork}
            disabled={forking}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-stone-400 hover:text-white border border-stone-700 rounded hover:border-stone-600 transition-colors disabled:opacity-50"
          >
            <GitFork className="w-4 h-4" />
            {forking ? 'Forking...' : 'Fork'}
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-stone-400 hover:text-white border border-stone-700 rounded hover:border-stone-600 transition-colors"
          >
            <Download className="w-4 h-4" />
            Download
          </button>
          {previewUrl && (
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 rounded transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Open
            </a>
          )}
        </div>
      </header>

      {/* Main */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Preview/Code */}
        <div className="flex-1 flex flex-col bg-stone-900 border-r border-stone-800">
          {/* Tabs */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-stone-800">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('preview')}
                className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded transition-colors ${
                  activeTab === 'preview' ? 'bg-orange-600 text-white' : 'text-stone-400 hover:text-white'
                }`}
              >
                <Eye className="w-4 h-4" /> Preview
              </button>
              <button
                onClick={() => setActiveTab('code')}
                className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded transition-colors ${
                  activeTab === 'code' ? 'bg-orange-600 text-white' : 'text-stone-400 hover:text-white'
                }`}
              >
                <Code className="w-4 h-4" /> Code
              </button>
            </div>
            
            <div className="flex items-center gap-2">
              {activeTab === 'preview' && (
                <>
                  <button
                    onClick={() => setMobileView(!mobileView)}
                    className={`p-1.5 rounded transition-colors ${mobileView ? 'bg-stone-700 text-white' : 'text-stone-500 hover:text-white'}`}
                    title={mobileView ? 'Desktop view' : 'Mobile view'}
                  >
                    {mobileView ? <Monitor className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />}
                  </button>
                  <button onClick={() => setIframeKey(k => k + 1)} className="p-1.5 text-stone-500 hover:text-white">
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </>
              )}
              {activeTab === 'code' && (
                <button onClick={copyCode} className="flex items-center gap-1 px-2 py-1 text-xs text-stone-400 hover:text-white">
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 relative flex items-center justify-center bg-stone-950">
            {activeTab === 'preview' ? (
              isProcessing && !previewUrl ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm text-stone-500">Building...</span>
                </div>
              ) : previewUrl ? (
                <div className={`h-full transition-all ${mobileView ? 'w-[375px] border-x border-stone-700' : 'w-full'}`}>
                  <iframe key={iframeKey} src={previewUrl} className="w-full h-full border-0 bg-white" title="Preview" />
                </div>
              ) : (
                <p className="text-stone-600">No preview yet</p>
              )
            ) : (
              <div className="absolute inset-0 flex flex-col">
                {files.length > 0 && (
                  <div className="flex items-center gap-1 px-4 py-2 border-b border-stone-800 bg-stone-900">
                    {files.map((file) => (
                      <button
                        key={file}
                        onClick={() => setActiveCodeFile(file)}
                        className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
                          activeCodeFile === file ? 'bg-stone-700 text-white' : 'text-stone-500 hover:text-white'
                        }`}
                      >
                        <FileCode className="w-3 h-3" />
                        {file}
                      </button>
                    ))}
                  </div>
                )}
                <pre className="flex-1 p-4 overflow-auto text-sm font-mono text-stone-300 leading-relaxed">
                  <code>{getFileContent(project, activeCodeFile)}</code>
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* Right: Chat */}
        <div className="w-80 flex flex-col bg-[#1c1917]">
          <div className="px-4 py-3 border-b border-stone-800 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-stone-400" />
            <span className="font-medium text-sm">Chat</span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-3 py-2 rounded-lg text-sm ${
                  msg.role === 'user' ? 'bg-orange-600 text-white' : 'bg-stone-800 text-stone-200'
                }`}>
                  {msg.content}
                  {msg.isLoading && (
                    <span className="ml-2 inline-block w-2 h-2 bg-current rounded-full animate-pulse" />
                  )}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          <div className="p-4 border-t border-stone-800">
            <div className="flex items-center gap-2 bg-stone-900 border border-stone-700 rounded-lg focus-within:border-orange-500">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder="Ask Claude to make changes..."
                className="flex-1 bg-transparent px-3 py-2 text-sm focus:outline-none placeholder-stone-600"
                disabled={isProcessing}
              />
              <button
                onClick={handleSend}
                disabled={!chatInput.trim() || isProcessing}
                className="p-2 text-stone-500 hover:text-orange-500 disabled:opacity-50"
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
  if (!project?.files) return [];
  return Object.keys(project.files).filter(f => project.files?.[f]);
}

function getFileContent(project: Project | null, filename: string): string {
  return project?.files?.[filename] || '';
}
