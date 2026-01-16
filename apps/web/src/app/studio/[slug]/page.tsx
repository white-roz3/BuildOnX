'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { fetchProject, refineProject, pollProjectStatus, Project, API_URL } from '@/lib/api';
import { 
  ExternalLink, RefreshCw, Maximize2, Send, Code, Eye, 
  FileCode, Copy, Check, X, MessageSquare
} from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
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

  // Scroll to bottom of chat
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

        // Add initial assistant message
        if (data.status === 'live' || data.status === 'completed' || data.status === 'deployed') {
          setMessages([{
            id: 'welcome',
            role: 'assistant',
            content: `Your app "${data.name || 'Untitled'}" is live! Ask me to make changes, add features, or fix anything.`,
            timestamp: new Date(),
          }]);
        } else if (data.status === 'building' || data.status === 'pending' || data.status === 'processing') {
          setIsProcessing(true);
          setMessages([{
            id: 'building',
            role: 'assistant',
            content: 'Building your app...',
            timestamp: new Date(),
            isLoading: true,
          }]);

          pollProjectStatus(slug, (updated) => {
            if (cancelled) return;
            setProject(updated);

            if (updated.status === 'completed' || updated.status === 'live' || updated.status === 'deployed') {
              setIsProcessing(false);
              setMessages([{
                id: 'done',
                role: 'assistant',
                content: `Done! Your app "${updated.name || 'Untitled'}" is now live. What would you like to change?`,
                timestamp: new Date(),
              }]);
              setIframeKey(k => k + 1);
            } else if (updated.status === 'error' || updated.status === 'failed') {
              setIsProcessing(false);
              setMessages([{
                id: 'error',
                role: 'assistant',
                content: 'Something went wrong during the build. Try describing what you want again.',
                timestamp: new Date(),
              }]);
            }
          }).catch(() => {
            if (!cancelled) {
              setIsProcessing(false);
            }
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

  const handleSend = async () => {
    if (!chatInput.trim() || isProcessing) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: chatInput,
      timestamp: new Date(),
    };

    const loadingMessage: ChatMessage = {
      id: `loading-${Date.now()}`,
      role: 'assistant',
      content: 'Making changes...',
      timestamp: new Date(),
      isLoading: true,
    };

    setMessages(prev => [...prev, userMessage, loadingMessage]);
    setChatInput('');
    setIsProcessing(true);

    try {
      await refineProject(slug, chatInput);

      await pollProjectStatus(slug, (updated) => {
        setProject(updated);

        if (updated.status === 'completed' || updated.status === 'live' || updated.status === 'deployed') {
          setIsProcessing(false);
          setMessages(prev => [
            ...prev.filter(m => !m.isLoading),
            {
              id: `done-${Date.now()}`,
              role: 'assistant',
              content: 'Done! I\'ve updated your app. Check the preview.',
              timestamp: new Date(),
            }
          ]);
          setIframeKey(k => k + 1);
        } else if (updated.status === 'error' || updated.status === 'failed') {
          setIsProcessing(false);
          setMessages(prev => [
            ...prev.filter(m => !m.isLoading),
            {
              id: `error-${Date.now()}`,
              role: 'assistant',
              content: 'I couldn\'t complete that change. Try rephrasing your request.',
              timestamp: new Date(),
            }
          ]);
        }
      });
    } catch {
      setIsProcessing(false);
      setMessages(prev => [
        ...prev.filter(m => !m.isLoading),
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: 'Something went wrong. Please try again.',
          timestamp: new Date(),
        }
      ]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const copyCode = () => {
    const content = getFileContent(project, activeCodeFile);
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const previewUrl = project?.status === 'live' || project?.status === 'completed' || project?.status === 'deployed'
    ? `${API_URL}/api/projects/${slug}/preview`
    : undefined;

  const files = project ? getProjectFiles(project) : [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAF9F7] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-[#D97706] border-t-transparent rounded-full animate-spin" />
          <p className="text-[#6B6560] text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (error && !project) {
    return (
      <div className="min-h-screen bg-[#FAF9F7] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-red-600">{error}</p>
          <Link href="/" className="text-sm text-[#D97706] hover:underline">← Back</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen h-screen flex flex-col bg-[#FAF9F7]">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-3 bg-white border-b border-[#E8E5E0]">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/claude-symbol.svg"
              alt="HeyClaude"
              width={24}
              height={24}
              className="w-6 h-6"
            />
            <span className="font-display font-semibold text-[#1C1917]">HeyClaude</span>
          </Link>
          <span className="text-[#D4D0C8]">/</span>
          <span className="text-sm text-[#6B6560] truncate max-w-[200px]">
            {project?.name || slug}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {previewUrl && (
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white
                       bg-[#D97706] hover:bg-[#B45309] rounded-lg transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open
            </a>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Preview/Code */}
        <div className="flex-1 flex flex-col bg-white border-r border-[#E8E5E0]">
          {/* Tabs */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-[#E8E5E0]">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveTab('preview')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'preview'
                    ? 'bg-[#F5F3F0] text-[#1C1917]'
                    : 'text-[#6B6560] hover:text-[#1C1917]'
                }`}
              >
                <Eye className="w-4 h-4" />
                Preview
              </button>
              <button
                onClick={() => setActiveTab('code')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'code'
                    ? 'bg-[#F5F3F0] text-[#1C1917]'
                    : 'text-[#6B6560] hover:text-[#1C1917]'
                }`}
              >
                <Code className="w-4 h-4" />
                Code
              </button>
            </div>
            
            <div className="flex items-center gap-1">
              {activeTab === 'preview' && (
                <>
                  <button 
                    onClick={() => setIframeKey(k => k + 1)}
                    className="p-1.5 text-[#6B6560] hover:text-[#1C1917] transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                  {previewUrl && (
                    <a 
                      href={previewUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-1.5 text-[#6B6560] hover:text-[#1C1917] transition-colors"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </a>
                  )}
                </>
              )}
              {activeTab === 'code' && (
                <button 
                  onClick={copyCode}
                  className="flex items-center gap-1.5 px-2 py-1 text-xs text-[#6B6560] hover:text-[#1C1917] transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 relative">
            {activeTab === 'preview' ? (
              isProcessing && !previewUrl ? (
                <div className="absolute inset-0 flex items-center justify-center bg-[#FAF9F7]">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-[#D97706] border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm text-[#6B6560]">Building...</span>
                  </div>
                </div>
              ) : previewUrl ? (
                <iframe 
                  key={iframeKey} 
                  src={previewUrl} 
                  className="w-full h-full border-0" 
                  title="Preview" 
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-[#FAF9F7]">
                  <p className="text-[#6B6560] text-sm">No preview yet</p>
                </div>
              )
            ) : (
              <div className="h-full flex flex-col">
                {/* File tabs */}
                {files.length > 0 && (
                  <div className="flex items-center gap-1 px-4 py-2 border-b border-[#E8E5E0] bg-[#FAF9F7]">
                    {files.map((file) => (
                      <button
                        key={file}
                        onClick={() => setActiveCodeFile(file)}
                        className={`flex items-center gap-1 px-2.5 py-1 text-xs font-mono rounded transition-colors ${
                          activeCodeFile === file
                            ? 'bg-white text-[#1C1917] shadow-sm'
                            : 'text-[#6B6560] hover:text-[#1C1917]'
                        }`}
                      >
                        <FileCode className="w-3 h-3" />
                        {file}
                      </button>
                    ))}
                  </div>
                )}
                
                {/* Code content */}
                <pre className="flex-1 overflow-auto p-4 text-sm font-mono text-[#3D3530] bg-[#FAF9F7] leading-relaxed">
                  <code>{getFileContent(project, activeCodeFile) || '// No content'}</code>
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* Right: Chat */}
        <div className="w-[400px] flex flex-col bg-white">
          {/* Chat Header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-[#E8E5E0]">
            <MessageSquare className="w-4 h-4 text-[#D97706]" />
            <span className="text-sm font-medium text-[#1C1917]">Chat</span>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    message.role === 'user'
                      ? 'bg-[#D97706] text-white rounded-br-md'
                      : 'bg-[#F5F3F0] text-[#1C1917] rounded-bl-md'
                  }`}
                >
                  {message.isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-[#D97706] border-t-transparent rounded-full animate-spin" />
                      <span className="text-[#6B6560]">{message.content}</span>
                    </div>
                  ) : (
                    message.content
                  )}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-[#E8E5E0]">
            <div className="flex items-end gap-2 bg-[#F5F3F0] rounded-xl p-2">
              <textarea
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask for changes..."
                disabled={isProcessing}
                rows={1}
                className="flex-1 bg-transparent text-[#1C1917] placeholder-[#A19D96] 
                         px-2 py-1.5 resize-none focus:outline-none text-sm min-h-[36px] max-h-[120px]"
                style={{ height: 'auto' }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = Math.min(target.scrollHeight, 120) + 'px';
                }}
              />
              <button
                onClick={handleSend}
                disabled={!chatInput.trim() || isProcessing}
                className="p-2 bg-[#D97706] hover:bg-[#B45309] text-white rounded-lg 
                         transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
  const files: string[] = [];
  
  // Check the files object first
  if (project.files) {
    return Object.keys(project.files);
  }
  
  // Fallback to individual content fields
  if (project.html_content) files.push('index.html');
  if (project.css_content) files.push('style.css');
  if (project.js_content) files.push('script.js');
  return files;
}

function getFileContent(project: Project | null, filename: string): string {
  if (!project) return '';
  
  // Check the files object first
  if (project.files && project.files[filename]) {
    return project.files[filename];
  }
  
  // Fallback to individual content fields
  switch (filename) {
    case 'index.html': return project.html_content || '';
    case 'style.css': return project.css_content || '';
    case 'script.js': return project.js_content || '';
    default: return '';
  }
}
