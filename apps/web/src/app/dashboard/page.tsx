'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { API_URL } from '@/lib/api';

interface Project {
  id: string;
  slug: string;
  name: string;
  original_prompt: string;
  deployment_status: string;
  created_at: string;
  views?: number;
  twitter_author?: string;
}

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchProjects();
    const interval = setInterval(fetchProjects, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await fetch(`${API_URL}/api/projects?limit=100`);
      if (res.ok) {
        const data = await res.json();
        setProjects(Array.isArray(data) ? data : data.items || []);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const filtered = projects.filter(p => {
    const matchesSearch = !search || 
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.slug.toLowerCase().includes(search.toLowerCase()) ||
      p.original_prompt?.toLowerCase().includes(search.toLowerCase());
    
    const matchesFilter = filter === 'all' ||
      (filter === 'live' && ['live', 'completed', 'deployed'].includes(p.deployment_status)) ||
      (filter === 'building' && ['building', 'pending', 'processing'].includes(p.deployment_status)) ||
      (filter === 'failed' && ['failed', 'error'].includes(p.deployment_status));
    
    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: projects.length,
    live: projects.filter(p => ['live', 'completed', 'deployed'].includes(p.deployment_status)).length,
    building: projects.filter(p => ['building', 'pending', 'processing'].includes(p.deployment_status)).length,
    failed: projects.filter(p => ['failed', 'error'].includes(p.deployment_status)).length,
  };

  const getStatus = (s: string) => {
    if (['live', 'completed', 'deployed'].includes(s)) return 'Live';
    if (['building', 'pending', 'processing'].includes(s)) return 'Building';
    if (['failed', 'error'].includes(s)) return 'Failed';
    return s;
  };

  const timeAgo = (date: string) => {
    const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
    if (mins < 60) return `${mins}m`;
    if (mins < 1440) return `${Math.floor(mins / 60)}h`;
    return `${Math.floor(mins / 1440)}d`;
  };

  return (
    <div className="min-h-screen bg-[#1c1917] text-stone-100">
      {/* Header */}
      <header className="border-b border-stone-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/claude-symbol.svg" alt="" width={24} height={24} />
            <Image src="/heyclaude-text.png" alt="HeyClaude" width={100} height={20} className="h-5 w-auto" />
          </Link>
          <div className="flex gap-4 text-sm">
            <Link href="/explore" className="text-stone-400 hover:text-white">Explore</Link>
            <Link href="/admin" className="text-stone-400 hover:text-white">Admin</Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-stone-900 border border-stone-800 rounded-lg p-4">
            <div className="text-2xl font-bold text-stone-100">{stats.total}</div>
            <div className="text-sm text-stone-500">Total</div>
          </div>
          <div className="bg-stone-900 border border-stone-800 rounded-lg p-4">
            <div className="text-2xl font-bold text-stone-100">{stats.live}</div>
            <div className="text-sm text-stone-500">Live</div>
          </div>
          <div className="bg-stone-900 border border-stone-800 rounded-lg p-4">
            <div className="text-2xl font-bold text-stone-100">{stats.building}</div>
            <div className="text-sm text-stone-500">Building</div>
          </div>
          <div className="bg-stone-900 border border-stone-800 rounded-lg p-4">
            <div className="text-2xl font-bold text-stone-100">{stats.failed}</div>
            <div className="text-sm text-stone-500">Failed</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-stone-900 border border-stone-800 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-orange-500"
          />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-stone-900 border border-stone-800 rounded-lg px-4 py-2 text-sm focus:outline-none"
          >
            <option value="all">All</option>
            <option value="live">Live</option>
            <option value="building">Building</option>
            <option value="failed">Failed</option>
          </select>
          <button
            onClick={fetchProjects}
            className="bg-orange-600 hover:bg-orange-700 px-4 py-2 rounded-lg text-sm font-medium"
          >
            Refresh
          </button>
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-20 text-stone-500">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-stone-500">No projects found</div>
        ) : (
          <div className="bg-stone-900 border border-stone-800 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-stone-800 text-stone-500 text-xs uppercase">
                <tr>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Project</th>
                  <th className="text-left px-4 py-3">Prompt</th>
                  <th className="text-left px-4 py-3">Age</th>
                  <th className="text-right px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800">
                {filtered.map((p) => {
                  return (
                    <tr key={p.id} className="hover:bg-stone-800/50">
                      <td className="px-4 py-3">
                        <span className="text-xs font-medium text-stone-400">{getStatus(p.deployment_status)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{p.name || 'Untitled'}</div>
                        <div className="text-xs text-stone-500 font-mono">{p.slug}</div>
                      </td>
                      <td className="px-4 py-3 text-stone-400 truncate max-w-[300px]">
                        {p.original_prompt}
                      </td>
                      <td className="px-4 py-3 text-stone-500">{timeAgo(p.created_at)}</td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/studio/${p.slug}`}
                          className="text-orange-500 hover:text-orange-400 text-xs"
                        >
                          Open
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-800 px-6 py-4 mt-8">
        <div className="max-w-6xl mx-auto text-center text-xs text-stone-600">
          <div>Built with Claude</div>
          <div className="font-mono mt-1">CA: 2d5G383QyAWEMvoFx2Qy4xYznjR4D9UBCgW1jiWApump</div>
        </div>
      </footer>
    </div>
  );
}
