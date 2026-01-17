'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { fetchProjects, Project } from '@/lib/api';

export default function ExplorePage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchProjects();
        setProjects(data.filter(p => ['live', 'completed', 'deployed'].includes(p.status)));
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    load();
  }, []);

  const filtered = projects.filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    return p.name?.toLowerCase().includes(q) || p.prompt?.toLowerCase().includes(q) || p.slug.includes(q);
  });

  return (
    <div className="min-h-screen bg-[#1c1917] text-stone-100">
      <header className="border-b border-stone-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/claude-symbol.svg" alt="" width={24} height={24} />
            <Image src="/heyclaude-text.png" alt="HeyClaude" width={100} height={20} className="h-5 w-auto" />
          </Link>
          <div className="flex gap-4 text-sm">
            <Link href="/templates" className="text-stone-400 hover:text-white">Templates</Link>
            <Link href="/leaderboard" className="text-stone-400 hover:text-white">Leaderboard</Link>
            <Link href="/dashboard" className="text-stone-400 hover:text-white">Dashboard</Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold mb-2">Explore</h1>
            <p className="text-stone-400">Browse apps built by the community</p>
          </div>
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-stone-900 border border-stone-800 rounded-lg px-4 py-2 text-sm w-64 focus:outline-none focus:border-orange-500"
          />
        </div>

        {loading ? (
          <div className="text-center py-20 text-stone-500">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-stone-500">No projects found</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((p) => (
              <Link
                key={p.id}
                href={`/studio/${p.slug}`}
                className="bg-stone-900 border border-stone-800 rounded-lg p-5 hover:border-stone-700 transition-colors"
              >
                <h3 className="font-semibold mb-2 truncate">{p.name || 'Untitled'}</h3>
                <p className="text-sm text-stone-500 line-clamp-2 mb-4 h-10">{p.prompt}</p>
                <div className="flex items-center justify-between text-xs text-stone-600">
                  <span>{p.view_count || 0} views</span>
                  <span className="text-orange-500">View</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <footer className="border-t border-stone-800 px-6 py-4 mt-8">
        <div className="max-w-6xl mx-auto text-center text-xs text-stone-600">
          <div>Built with Claude</div>
          <div className="font-mono mt-1">CA: 2d5G383QyAWEMvoFx2Qy4xYznjR4D9UBCgW1jiWApump</div>
        </div>
      </footer>
    </div>
  );
}
