'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { fetchProjects, Project } from '@/lib/api';
import { Search, Plus, Eye, ExternalLink, Twitter } from 'lucide-react';

export default function ExplorePage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const data = await fetchProjects();
        setProjects(data);
      } catch (err) {
        console.error('Failed to load projects:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadProjects();
  }, []);

  const filteredProjects = projects.filter((project) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      project.name?.toLowerCase().includes(query) ||
      project.prompt?.toLowerCase().includes(query) ||
      project.slug.toLowerCase().includes(query)
    );
  });

  return (
    <div className="min-h-screen bg-bg-main flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
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
        
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64 pl-10 pr-4 py-2 text-sm bg-bg-card border border-border rounded-lg
                       text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
            />
          </div>
          
          <Link
            href="/"
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white
                     bg-accent hover:bg-accent-hover rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Build
          </Link>
          
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

      {/* Main Content */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-text-primary mb-2">Explore</h1>
          <p className="text-text-secondary">See what others have built with HeyClaude</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <div className="flex flex-col items-center gap-4">
              <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              <p className="text-text-secondary text-sm">Loading projects...</p>
            </div>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-text-secondary mb-4">
              {searchQuery ? 'No projects match your search' : 'No projects yet'}
            </p>
            <Link href="/" className="text-accent hover:underline font-medium">
              Build the first one →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredProjects.map((project) => (
              <ProjectCard key={project.slug} project={project} />
            ))}
          </div>
        )}
      </main>

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

function ProjectCard({ project }: { project: Project }) {
  const status = project.status === 'completed' ? 'live' : project.status === 'error' ? 'error' : 'building';
  
  return (
    <Link
      href={`/p/${project.slug}`}
      className="group flex flex-col bg-bg-card border border-border rounded-xl overflow-hidden
               hover:border-accent transition-all duration-200"
    >
      {/* Preview */}
      <div className="relative aspect-video bg-bg-main overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-12 h-12 rounded-lg bg-bg-hover flex items-center justify-center">
            <span className="text-xl">🚀</span>
          </div>
        </div>
        
        {/* Status badge */}
        <div className="absolute top-3 right-3">
          <span className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs font-semibold rounded-md ${
            status === 'live' ? 'bg-status-live/20 text-status-live' :
            status === 'error' ? 'bg-status-error/20 text-status-error' :
            'bg-accent/20 text-accent'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${
              status === 'live' ? 'bg-status-live' :
              status === 'error' ? 'bg-status-error' :
              'bg-accent animate-pulse'
            }`} />
            {status === 'live' ? 'Live' : status === 'error' ? 'Error' : 'Building'}
          </span>
        </div>
        
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-bg-main/80 opacity-0 group-hover:opacity-100 
                      transition-opacity flex items-center justify-center">
          <span className="flex items-center gap-2 px-4 py-2 bg-accent text-white 
                         text-sm font-semibold rounded-lg">
            View <ExternalLink className="w-4 h-4" />
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="text-sm font-semibold text-text-primary truncate mb-1">
          {project.name || project.prompt.slice(0, 50)}
        </h3>
        <p className="text-xs text-text-muted line-clamp-2 mb-3">{project.prompt}</p>
        
        <div className="flex items-center justify-between">
          {project.twitter_author && (
            <span className="text-xs text-text-muted">@{project.twitter_author}</span>
          )}
          {project.view_count !== undefined && (
            <span className="flex items-center gap-1 text-xs text-text-muted">
              <Eye className="w-3.5 h-3.5" />
              {project.view_count}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
