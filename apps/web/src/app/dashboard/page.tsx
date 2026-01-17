'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { API_URL } from '@/lib/api';
import {
  Search, Filter, ChevronDown, ChevronUp, ExternalLink, RefreshCw,
  Clock, CheckCircle, XCircle, Loader, Eye, Code, Calendar,
  ArrowUpRight, MoreVertical, Copy, Trash2, RotateCcw, SortAsc, SortDesc,
  LayoutGrid, List, Activity, TrendingUp, AlertTriangle
} from 'lucide-react';

interface Project {
  id: string;
  slug: string;
  name: string;
  original_prompt: string;
  deployment_status: string;
  deployment_url?: string;
  created_at: string;
  updated_at?: string;
  views?: number;
  twitter_author?: string;
  error_message?: string;
  files?: Record<string, string>;
}

type SortField = 'created_at' | 'name' | 'status' | 'views';
type SortOrder = 'asc' | 'desc';
type ViewMode = 'grid' | 'list';
type StatusFilter = 'all' | 'live' | 'building' | 'failed';

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const fetchProjects = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/projects?limit=100`);
      if (res.ok) {
        const data = await res.json();
        setProjects(Array.isArray(data) ? data : data.items || []);
      }
    } catch (e) {
      console.error('Failed to fetch projects:', e);
    }

    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchProjects();
    const interval = setInterval(() => fetchProjects(true), 30000);
    return () => clearInterval(interval);
  }, [fetchProjects]);

  useEffect(() => {
    let result = [...projects];

    // Filter by search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p =>
        p.name?.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        p.original_prompt?.toLowerCase().includes(q) ||
        p.twitter_author?.toLowerCase().includes(q)
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      result = result.filter(p => {
        const status = p.deployment_status;
        if (statusFilter === 'live') return ['live', 'completed', 'deployed'].includes(status);
        if (statusFilter === 'building') return ['building', 'pending', 'processing'].includes(status);
        if (statusFilter === 'failed') return ['failed', 'error'].includes(status);
        return true;
      });
    }

    // Sort
    result.sort((a, b) => {
      let aVal: any, bVal: any;
      switch (sortField) {
        case 'name':
          aVal = a.name || a.slug;
          bVal = b.name || b.slug;
          break;
        case 'status':
          aVal = a.deployment_status;
          bVal = b.deployment_status;
          break;
        case 'views':
          aVal = a.views || 0;
          bVal = b.views || 0;
          break;
        default:
          aVal = new Date(a.created_at).getTime();
          bVal = new Date(b.created_at).getTime();
      }
      if (sortOrder === 'asc') return aVal > bVal ? 1 : -1;
      return aVal < bVal ? 1 : -1;
    });

    setFilteredProjects(result);
  }, [projects, searchQuery, statusFilter, sortField, sortOrder]);

  const getStatusInfo = (status: string) => {
    if (['live', 'completed', 'deployed'].includes(status)) {
      return { label: 'Live', color: 'text-green-400', bg: 'bg-green-500/20', icon: CheckCircle };
    }
    if (['building', 'pending', 'processing'].includes(status)) {
      return { label: 'Building', color: 'text-yellow-400', bg: 'bg-yellow-500/20', icon: Loader };
    }
    if (['failed', 'error'].includes(status)) {
      return { label: 'Failed', color: 'text-red-400', bg: 'bg-red-500/20', icon: XCircle };
    }
    return { label: status, color: 'text-gray-400', bg: 'bg-gray-500/20', icon: Clock };
  };

  const stats = {
    total: projects.length,
    live: projects.filter(p => ['live', 'completed', 'deployed'].includes(p.deployment_status)).length,
    building: projects.filter(p => ['building', 'pending', 'processing'].includes(p.deployment_status)).length,
    failed: projects.filter(p => ['failed', 'error'].includes(p.deployment_status)).length,
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-[#1c1917]">
      {/* Header */}
      <header className="bg-[#292524] border-b border-[#44403c] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-2">
                <Image src="/claude-symbol.svg" alt="" width={28} height={28} />
                <Image src="/heyclaude-text.png" alt="HeyClaude" width={110} height={22} className="h-[22px] w-auto" />
              </Link>
              <span className="text-[#44403c]">/</span>
              <span className="text-white font-semibold">Dashboard</span>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/explore"
                className="px-3 py-2 text-sm text-[#a8a29e] hover:text-white transition-colors"
              >
                Explore
              </Link>
              <Link
                href="/admin"
                className="px-3 py-2 text-sm text-[#a8a29e] hover:text-white transition-colors"
              >
                Admin
              </Link>
              <button
                onClick={() => fetchProjects(true)}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2 bg-[#ea580c] text-white rounded-lg text-sm font-medium hover:bg-[#c2410c] disabled:opacity-50 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard label="Total Projects" value={stats.total} icon={<Activity className="w-5 h-5" />} color="blue" />
          <StatCard label="Live" value={stats.live} icon={<CheckCircle className="w-5 h-5" />} color="green" />
          <StatCard label="Building" value={stats.building} icon={<Loader className="w-5 h-5" />} color="yellow" />
          <StatCard label="Failed" value={stats.failed} icon={<AlertTriangle className="w-5 h-5" />} color="red" />
        </div>

        {/* Toolbar */}
        <div className="bg-[#292524] border border-[#44403c] rounded-xl p-4 mb-6">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#78716c]" />
              <input
                type="text"
                placeholder="Search projects by name, slug, prompt, or author..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-[#1c1917] border border-[#44403c] rounded-lg text-white placeholder-[#78716c] text-sm focus:outline-none focus:border-[#ea580c] transition-colors"
              />
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3">
              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="px-3 py-2.5 bg-[#1c1917] border border-[#44403c] rounded-lg text-white text-sm focus:outline-none focus:border-[#ea580c] cursor-pointer"
              >
                <option value="all">All Status</option>
                <option value="live">Live</option>
                <option value="building">Building</option>
                <option value="failed">Failed</option>
              </select>

              {/* Sort */}
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value as SortField)}
                className="px-3 py-2.5 bg-[#1c1917] border border-[#44403c] rounded-lg text-white text-sm focus:outline-none focus:border-[#ea580c] cursor-pointer"
              >
                <option value="created_at">Date Created</option>
                <option value="name">Name</option>
                <option value="status">Status</option>
                <option value="views">Views</option>
              </select>

              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="p-2.5 bg-[#1c1917] border border-[#44403c] rounded-lg text-[#a8a29e] hover:text-white hover:border-[#ea580c] transition-colors"
                title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
              >
                {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
              </button>

              {/* View Toggle */}
              <div className="flex items-center bg-[#1c1917] border border-[#44403c] rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2.5 transition-colors ${viewMode === 'list' ? 'bg-[#ea580c] text-white' : 'text-[#a8a29e] hover:text-white'}`}
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2.5 transition-colors ${viewMode === 'grid' ? 'bg-[#ea580c] text-white' : 'text-[#a8a29e] hover:text-white'}`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Results count */}
          <div className="mt-3 pt-3 border-t border-[#44403c] text-sm text-[#78716c]">
            Showing {filteredProjects.length} of {projects.length} projects
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader className="w-8 h-8 text-[#ea580c] animate-spin" />
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredProjects.length === 0 && (
          <div className="text-center py-20">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#292524] flex items-center justify-center">
              <Search className="w-8 h-8 text-[#78716c]" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No projects found</h3>
            <p className="text-[#78716c] text-sm">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Projects will appear here once created'}
            </p>
          </div>
        )}

        {/* List View */}
        {!loading && viewMode === 'list' && filteredProjects.length > 0 && (
          <div className="bg-[#292524] border border-[#44403c] rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-[#1c1917]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#78716c] uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#78716c] uppercase tracking-wider">Project</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#78716c] uppercase tracking-wider hidden lg:table-cell">Prompt</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#78716c] uppercase tracking-wider hidden md:table-cell">Created</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#78716c] uppercase tracking-wider hidden md:table-cell">Views</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-[#78716c] uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#44403c]">
                {filteredProjects.map((project) => {
                  const statusInfo = getStatusInfo(project.deployment_status);
                  const StatusIcon = statusInfo.icon;
                  return (
                    <tr key={project.id} className="hover:bg-[#1c1917]/50 transition-colors">
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusInfo.bg} ${statusInfo.color}`}>
                          <StatusIcon className={`w-3 h-3 ${statusInfo.label === 'Building' ? 'animate-spin' : ''}`} />
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div>
                          <p className="text-sm font-medium text-white">{project.name || 'Untitled'}</p>
                          <p className="text-xs text-[#78716c] font-mono">{project.slug}</p>
                          {project.twitter_author && (
                            <p className="text-xs text-[#a8a29e] mt-1">by @{project.twitter_author}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 hidden lg:table-cell">
                        <p className="text-sm text-[#a8a29e] truncate max-w-[300px]" title={project.original_prompt}>
                          {project.original_prompt}
                        </p>
                      </td>
                      <td className="px-4 py-4 hidden md:table-cell">
                        <span className="text-sm text-[#78716c]">{formatDate(project.created_at)}</span>
                      </td>
                      <td className="px-4 py-4 hidden md:table-cell">
                        <span className="text-sm text-[#78716c]">{project.views || 0}</span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/studio/${project.slug}`}
                            className="p-2 text-[#a8a29e] hover:text-[#ea580c] transition-colors"
                            title="Open Studio"
                          >
                            <Code className="w-4 h-4" />
                          </Link>
                          {project.deployment_url && (
                            <a
                              href={project.deployment_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 text-[#a8a29e] hover:text-[#ea580c] transition-colors"
                              title="View Live"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                          <button
                            onClick={() => copyToClipboard(`https://heyclaude.xyz/studio/${project.slug}`)}
                            className="p-2 text-[#a8a29e] hover:text-[#ea580c] transition-colors"
                            title="Copy Link"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Grid View */}
        {!loading && viewMode === 'grid' && filteredProjects.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProjects.map((project) => {
              const statusInfo = getStatusInfo(project.deployment_status);
              const StatusIcon = statusInfo.icon;
              return (
                <div
                  key={project.id}
                  className="bg-[#292524] border border-[#44403c] rounded-xl p-5 hover:border-[#ea580c]/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusInfo.bg} ${statusInfo.color}`}>
                      <StatusIcon className={`w-3 h-3 ${statusInfo.label === 'Building' ? 'animate-spin' : ''}`} />
                      {statusInfo.label}
                    </span>
                    <span className="text-xs text-[#78716c]">{formatDate(project.created_at)}</span>
                  </div>

                  <h3 className="text-white font-medium mb-1 truncate">{project.name || 'Untitled'}</h3>
                  <p className="text-xs text-[#78716c] font-mono mb-3">{project.slug}</p>
                  <p className="text-sm text-[#a8a29e] line-clamp-2 mb-4 h-10">{project.original_prompt}</p>

                  {project.twitter_author && (
                    <p className="text-xs text-[#78716c] mb-4">by @{project.twitter_author}</p>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t border-[#44403c]">
                    <div className="flex items-center gap-1 text-xs text-[#78716c]">
                      <Eye className="w-3.5 h-3.5" />
                      {project.views || 0} views
                    </div>
                    <div className="flex items-center gap-1">
                      <Link
                        href={`/studio/${project.slug}`}
                        className="p-1.5 text-[#a8a29e] hover:text-[#ea580c] transition-colors"
                        title="Open Studio"
                      >
                        <Code className="w-4 h-4" />
                      </Link>
                      {project.deployment_url && (
                        <a
                          href={project.deployment_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-[#a8a29e] hover:text-[#ea580c] transition-colors"
                          title="View Live"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                      <button
                        onClick={() => copyToClipboard(`https://heyclaude.xyz/studio/${project.slug}`)}
                        className="p-1.5 text-[#a8a29e] hover:text-[#ea580c] transition-colors"
                        title="Copy Link"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#44403c] mt-8">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex flex-col items-center gap-2 text-sm">
            <div className="flex items-center gap-2 text-[#78716c]">
              <span>Built with</span>
              <span className="text-[#ea580c]">*</span>
              <span className="text-[#a8a29e]">Claude</span>
            </div>
            <div className="text-xs text-[#78716c] font-mono">
              CA: 2d5G383QyAWEMvoFx2Qy4xYznjR4D9UBCgW1jiWApump
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  const colors: Record<string, { text: string; bg: string }> = {
    blue: { text: 'text-blue-400', bg: 'bg-blue-500/20' },
    green: { text: 'text-green-400', bg: 'bg-green-500/20' },
    yellow: { text: 'text-yellow-400', bg: 'bg-yellow-500/20' },
    red: { text: 'text-red-400', bg: 'bg-red-500/20' },
  };
  const c = colors[color] || colors.blue;

  return (
    <div className="bg-[#292524] border border-[#44403c] rounded-xl p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-lg ${c.bg}`}>
          <span className={c.text}>{icon}</span>
        </div>
        <div>
          <p className="text-xs text-[#78716c] uppercase tracking-wide">{label}</p>
          <p className={`text-2xl font-bold ${c.text}`}>{value}</p>
        </div>
      </div>
    </div>
  );
}

