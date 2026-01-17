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
  views: number;
  forks: number;
  created_at: string;
  twitter_author?: string;
}

export default function LeaderboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'views' | 'forks' | 'recent'>('views');

  useEffect(() => {
    fetchProjects();
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

  const sorted = [...projects]
    .filter(p => ['live', 'completed', 'deployed'].includes(p.deployment_status))
    .sort((a, b) => {
      if (sortBy === 'views') return (b.views || 0) - (a.views || 0);
      if (sortBy === 'forks') return (b.forks || 0) - (a.forks || 0);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    })
    .slice(0, 50);

  return (
    <div className="min-h-screen bg-[#1c1917] text-stone-100">
      <header className="border-b border-stone-800 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/claude-symbol.svg" alt="" width={24} height={24} />
            <Image src="/heyclaude-text.png" alt="HeyClaude" width={100} height={20} className="h-5 w-auto" />
          </Link>
          <div className="flex gap-4 text-sm">
            <Link href="/explore" className="text-stone-400 hover:text-white">Explore</Link>
            <Link href="/templates" className="text-stone-400 hover:text-white">Templates</Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold mb-2">Leaderboard</h1>
            <p className="text-stone-400">Top projects by popularity</p>
          </div>
          <div className="flex gap-2">
            {(['views', 'forks', 'recent'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSortBy(s)}
                className={`px-3 py-1.5 rounded text-sm capitalize ${
                  sortBy === s
                    ? 'bg-orange-600 text-white'
                    : 'bg-stone-800 text-stone-400 hover:text-white'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-stone-500">Loading...</div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-20 text-stone-500">No projects yet</div>
        ) : (
          <div className="space-y-2">
            {sorted.map((project, i) => (
              <div
                key={project.id}
                className="flex items-center gap-4 bg-stone-900 border border-stone-800 rounded-lg p-4 hover:border-stone-700 transition-colors"
              >
                <div className="w-8 text-center text-lg font-bold text-stone-500">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{project.name || 'Untitled'}</span>
                    {project.twitter_author && (
                      <span className="text-xs text-stone-500">by @{project.twitter_author}</span>
                    )}
                  </div>
                  <p className="text-sm text-stone-500 truncate">{project.original_prompt}</p>
                </div>
                <div className="flex items-center gap-6 text-sm text-stone-400">
                  <div className="text-center">
                    <div className="font-medium text-stone-200">{project.views || 0}</div>
                    <div className="text-xs">views</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-stone-200">{project.forks || 0}</div>
                    <div className="text-xs">forks</div>
                  </div>
                </div>
                <Link
                  href={`/studio/${project.slug}`}
                  className="text-orange-500 hover:text-orange-400 text-sm"
                >
                  View
                </Link>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="border-t border-stone-800 px-6 py-4 mt-8">
        <div className="max-w-4xl mx-auto text-center text-xs text-stone-600">
          <div>Built with Claude</div>
          <div className="font-mono mt-1">CA: 2d5G383QyAWEMvoFx2Qy4xYznjR4D9UBCgW1jiWApump</div>
        </div>
      </footer>
    </div>
  );
}

