'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { fetchProject, Project, API_URL } from '@/lib/api';
import { 
  ExternalLink, Edit3, Twitter, Eye, Calendar, Code, Share2
} from 'lucide-react';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default function ProjectPage({ params }: PageProps) {
  const { slug } = use(params);
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCode, setShowCode] = useState(false);
  const [activeTab, setActiveTab] = useState<'html' | 'css' | 'js'>('html');

  useEffect(() => {
    const loadProject = async () => {
      try {
        const data = await fetchProject(slug);
        setProject(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load project');
      } finally {
        setIsLoading(false);
      }
    };
    loadProject();
  }, [slug]);

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

  if (error || !project) {
    return (
      <div className="min-h-screen bg-bg-main flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-status-error">{error || 'Project not found'}</p>
          <Link href="/" className="text-sm text-accent hover:underline">← Back to Home</Link>
        </div>
      </div>
    );
  }

  const previewUrl = `${API_URL}/api/projects/${slug}/preview`;

  return (
    <div className="min-h-screen flex flex-col bg-bg-main">
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
        </div>
        
        <div className="flex items-center gap-3">
          <Link
            href={`/studio/${slug}`}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-text-secondary
                     bg-bg-card border border-border rounded-lg hover:border-accent 
                     hover:text-text-primary transition-colors"
          >
            <Edit3 className="w-4 h-4" />
            Edit
          </Link>
          <a
            href={previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white
                     bg-accent hover:bg-accent-hover rounded-lg transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Open Live
          </a>
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

      {/* Project Info */}
      <div className="px-6 py-6 border-b border-border-subtle">
        <div className="max-w-4xl">
          <h1 className="text-2xl font-display font-bold text-text-primary mb-2">
            {project.name || 'Untitled Project'}
          </h1>
          <p className="text-text-secondary mb-4 max-w-2xl">{project.prompt}</p>
          
          <div className="flex items-center gap-4 text-sm text-text-muted">
            {project.twitter_author && (
              <span className="flex items-center gap-1.5">
                <Twitter className="w-4 h-4" />
                @{project.twitter_author}
              </span>
            )}
            {project.view_count !== undefined && (
              <span className="flex items-center gap-1.5">
                <Eye className="w-4 h-4" />
                {project.view_count} views
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              {new Date(project.created_at).toLocaleDateString()}
            </span>
            <span className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs font-semibold rounded-md ${
              project.status === 'completed' 
                ? 'bg-status-live/20 text-status-live' 
                : 'bg-accent/20 text-accent'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                project.status === 'completed' ? 'bg-status-live' : 'bg-accent animate-pulse'
              }`} />
              {project.status === 'completed' ? 'Live' : project.status}
            </span>
          </div>
        </div>
      </div>

      {/* View Toggle */}
      <div className="px-6 py-3 border-b border-border-subtle flex items-center justify-between bg-bg-card">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCode(false)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              !showCode ? 'bg-accent text-white' : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
            }`}
          >
            Preview
          </button>
          <button
            onClick={() => setShowCode(true)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              showCode ? 'bg-accent text-white' : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
            }`}
          >
            <Code className="w-4 h-4" />
            Code
          </button>
        </div>
        
        <button className="flex items-center gap-2 px-4 py-2 text-sm text-text-secondary 
                         bg-bg-hover rounded-lg hover:text-text-primary transition-colors">
          <Share2 className="w-4 h-4" />
          Share
        </button>
      </div>

      {/* Content */}
      <div className="flex-1">
        {showCode ? (
          <div className="h-full flex flex-col p-6">
            {/* Code tabs */}
            <div className="flex items-center gap-1 mb-4">
              {(['html', 'css', 'js'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-sm font-mono rounded-lg transition-colors ${
                    activeTab === tab
                      ? 'bg-bg-hover text-text-primary'
                      : 'text-text-muted hover:text-text-secondary'
                  }`}
                >
                  {tab === 'html' ? 'index.html' : tab === 'css' ? 'style.css' : 'script.js'}
                </button>
              ))}
            </div>

            {/* Code block */}
            <div className="flex-1 bg-bg-card border border-border rounded-xl overflow-hidden">
              <pre className="p-4 overflow-auto h-full text-sm font-mono text-text-secondary leading-relaxed">
                <code>
                  {activeTab === 'html' && (project.html_content || '<!-- No HTML content -->')}
                  {activeTab === 'css' && (project.css_content || '/* No CSS content */')}
                  {activeTab === 'js' && (project.js_content || '// No JavaScript content')}
                </code>
              </pre>
            </div>
          </div>
        ) : (
          <div className="h-[calc(100vh-280px)] bg-white">
            <iframe
              src={previewUrl}
              className="w-full h-full border-0"
              title="Project Preview"
            />
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="px-6 py-4 border-t border-border-subtle">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-text-muted">
            <span>Built with</span>
            <span className="text-accent">✳</span>
            <span className="text-text-secondary">HeyClaude</span>
          </div>
          <div className="font-mono text-xs text-text-muted">
            CA: FeuQgovgEifmohmohDj2PdMV4NLAhqzdCytubsys3vVpump
          </div>
        </div>
      </footer>
    </div>
  );
}
