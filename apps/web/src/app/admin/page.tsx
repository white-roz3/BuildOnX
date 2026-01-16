'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { API_URL } from '@/lib/api';

export default function AdminPage() {
  const [stats, setStats] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [health, setHealth] = useState<any>(null);
  const [twitterDebug, setTwitterDebug] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev.slice(-99), `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    addLog('Fetching admin data...');

    try {
      // Fetch stats
      const statsRes = await fetch(`${API_URL}/admin/stats`);
      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
        addLog(`Stats loaded: ${data.total_projects} projects`);
      }

      // Fetch projects
      const projRes = await fetch(`${API_URL}/api/projects?limit=50`);
      if (projRes.ok) {
        const data = await projRes.json();
        setProjects(Array.isArray(data) ? data : data.items || []);
        addLog(`Projects loaded: ${(Array.isArray(data) ? data : data.items || []).length} items`);
      }

      // Fetch health
      const healthRes = await fetch(`${API_URL}/health`);
      if (healthRes.ok) {
        const data = await healthRes.json();
        setHealth(data);
        addLog(`Health: ${data.status}`);
      }

      // Fetch Twitter debug
      const twitterRes = await fetch(`${API_URL}/admin/debug/twitter`);
      if (twitterRes.ok) {
        const data = await twitterRes.json();
        setTwitterDebug(data);
        addLog('Twitter debug loaded');
      }

    } catch (e: any) {
      addLog(`Error: ${e.message}`);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const rebuildProject = async (slug: string) => {
    addLog(`Rebuilding ${slug}...`);
    try {
      const res = await fetch(`${API_URL}/admin/rebuild/${slug}`, { method: 'POST' });
      const data = await res.json();
      addLog(`Rebuild response: ${JSON.stringify(data).slice(0, 100)}`);
      fetchData();
    } catch (e: any) {
      addLog(`Rebuild error: ${e.message}`);
    }
  };

  const cleanupFailed = async () => {
    addLog('Cleaning up failed builds...');
    try {
      const res = await fetch(`${API_URL}/admin/cleanup/failed`, { method: 'POST' });
      const data = await res.json();
      addLog(`Cleanup: ${JSON.stringify(data)}`);
      fetchData();
    } catch (e: any) {
      addLog(`Cleanup error: ${e.message}`);
    }
  };

  const statusColor = (status: string) => {
    if (['live', 'completed', 'deployed'].includes(status)) return 'text-green-400 bg-green-500/20';
    if (['building', 'pending', 'processing'].includes(status)) return 'text-yellow-400 bg-yellow-500/20';
    if (['failed', 'error'].includes(status)) return 'text-red-400 bg-red-500/20';
    return 'text-gray-400 bg-gray-500/20';
  };

  return (
    <div className="min-h-screen bg-[#1c1917] text-white">
      {/* Header */}
      <header className="bg-[#292524] border-b border-[#44403c] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/claude-symbol.svg" alt="" width={24} height={24} />
            <Image src="/heyclaude-text.png" alt="HeyClaude" width={100} height={20} className="h-5 w-auto" />
            <span>👋</span>
          </Link>
          <span className="text-[#78716c]">/</span>
          <span className="font-semibold text-[#ea580c]">Admin Dashboard</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-[#78716c]">
            {loading ? 'Loading...' : `Last update: ${new Date().toLocaleTimeString()}`}
          </span>
          <button
            onClick={fetchData}
            disabled={loading}
            className="px-4 py-2 bg-[#ea580c] text-white rounded-lg text-sm font-medium hover:bg-[#c2410c] disabled:opacity-50"
          >
            {loading ? '⟳' : 'Refresh'}
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-[#292524] border-b border-[#44403c] px-6">
        <div className="flex gap-1">
          {['overview', 'projects', 'logs', 'system'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-sm font-medium capitalize border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-[#ea580c] text-[#ea580c]'
                  : 'border-transparent text-[#a8a29e] hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <main className="p-6 max-w-7xl mx-auto">

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Total Projects" value={stats?.total_projects || 0} color="blue" />
              <StatCard label="Live" value={projects.filter(p => ['live','completed','deployed'].includes(p.deployment_status)).length} color="green" />
              <StatCard label="Building" value={projects.filter(p => ['building','pending','processing'].includes(p.deployment_status)).length} color="yellow" />
              <StatCard label="Failed" value={projects.filter(p => ['failed','error'].includes(p.deployment_status)).length} color="red" />
            </div>

            {/* Quick Actions */}
            <div className="bg-[#292524] border border-[#44403c] rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
              <div className="flex flex-wrap gap-3">
                <button onClick={cleanupFailed} className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30">
                  🗑️ Cleanup Failed
                </button>
                <a href={`${API_URL}/docs`} target="_blank" rel="noreferrer" className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30">
                  📚 API Docs
                </a>
                <a href="https://twitter.com/buildheyclaude" target="_blank" rel="noreferrer" className="px-4 py-2 bg-sky-500/20 text-sky-400 rounded-lg hover:bg-sky-500/30">
                  🐦 Twitter
                </a>
              </div>
            </div>

            {/* Recent Projects */}
            <div className="bg-[#292524] border border-[#44403c] rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">Recent Projects</h2>
              <div className="space-y-2">
                {projects.slice(0, 10).map(p => (
                  <div key={p.id} className="flex items-center justify-between p-3 bg-[#1c1917] rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-1 text-xs rounded ${statusColor(p.deployment_status)}`}>
                        {p.deployment_status}
                      </span>
                      <div>
                        <p className="text-sm font-medium">{p.name || p.slug}</p>
                        <p className="text-xs text-[#78716c] truncate max-w-[300px]">{p.original_prompt}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link href={`/studio/${p.slug}`} className="text-xs text-[#ea580c] hover:underline">
                        Open →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* PROJECTS TAB */}
        {activeTab === 'projects' && (
          <div className="bg-[#292524] border border-[#44403c] rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[#1c1917] text-[#78716c] text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Slug</th>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Prompt</th>
                  <th className="px-4 py-3 text-left">Created</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#44403c]">
                {projects.map(p => (
                  <tr key={p.id} className="hover:bg-[#1c1917]/50">
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded ${statusColor(p.deployment_status)}`}>
                        {p.deployment_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-[#a8a29e]">{p.slug}</td>
                    <td className="px-4 py-3">{p.name || '—'}</td>
                    <td className="px-4 py-3 text-[#a8a29e] truncate max-w-[200px]">{p.original_prompt}</td>
                    <td className="px-4 py-3 text-[#78716c] text-xs">{new Date(p.created_at).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Link href={`/studio/${p.slug}`} className="text-[#ea580c] hover:underline text-xs">
                          Studio
                        </Link>
                        <button onClick={() => rebuildProject(p.slug)} className="text-yellow-400 hover:underline text-xs">
                          Rebuild
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* LOGS TAB */}
        {activeTab === 'logs' && (
          <div className="space-y-6">
            {/* Activity Log */}
            <div className="bg-[#292524] border border-[#44403c] rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Activity Log</h2>
                <button onClick={() => setLogs([])} className="text-xs text-[#78716c] hover:text-white">
                  Clear
                </button>
              </div>
              <div className="bg-[#1c1917] rounded-lg p-4 h-64 overflow-y-auto font-mono text-xs text-[#a8a29e]">
                {logs.length === 0 ? (
                  <p className="text-[#78716c]">No logs yet...</p>
                ) : (
                  logs.map((log, i) => <p key={i}>{log}</p>)
                )}
              </div>
            </div>

            {/* Error Projects */}
            <div className="bg-[#292524] border border-[#44403c] rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4 text-red-400">Failed Builds</h2>
              <div className="space-y-2">
                {projects.filter(p => ['failed', 'error'].includes(p.deployment_status)).length === 0 ? (
                  <p className="text-[#78716c] text-sm">✅ No failed builds</p>
                ) : (
                  projects
                    .filter(p => ['failed', 'error'].includes(p.deployment_status))
                    .map(p => (
                      <div key={p.id} className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-red-400">{p.slug}</p>
                            <p className="text-xs text-[#78716c] mt-1">{p.original_prompt}</p>
                            {p.error_message && (
                              <p className="text-xs text-red-300 mt-2 font-mono bg-red-500/20 p-2 rounded">
                                {p.error_message}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => rebuildProject(p.slug)}
                            className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs hover:bg-yellow-500/30"
                          >
                            Retry
                          </button>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* SYSTEM TAB */}
        {activeTab === 'system' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Health */}
            <div className="bg-[#292524] border border-[#44403c] rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">System Health</h2>
              <div className="space-y-3">
                <HealthRow label="API Status" value={health?.status || 'unknown'} ok={health?.status === 'healthy'} />
                <HealthRow label="Database" value="PostgreSQL" ok={!!health} />
                <HealthRow label="Claude API Key" value={health?.api_key_from_env > 0 ? 'Configured' : 'Missing'} ok={health?.api_key_from_env > 0} />
                <HealthRow label="Model" value={health?.model || 'unknown'} ok={!!health?.model} />
              </div>
            </div>

            {/* Twitter */}
            <div className="bg-[#292524] border border-[#44403c] rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">Twitter Bot</h2>
              <div className="space-y-3">
                <HealthRow label="Bot Enabled" value={twitterDebug?.bot_enabled ? 'Yes' : 'No'} ok={twitterDebug?.bot_enabled} />
                <HealthRow label="Bot User ID" value={twitterDebug?.bot_user_id || 'Not set'} ok={!!twitterDebug?.bot_user_id} />
                <HealthRow label="Bearer Token" value={twitterDebug?.has_bearer_token ? 'Set' : 'Missing'} ok={twitterDebug?.has_bearer_token} />
                <HealthRow label="Access Token" value={twitterDebug?.has_access_token ? 'Set' : 'Missing'} ok={twitterDebug?.has_access_token} />
              </div>
            </div>

            {/* Config */}
            <div className="bg-[#292524] border border-[#44403c] rounded-xl p-6 md:col-span-2">
              <h2 className="text-lg font-semibold mb-4">Configuration</h2>
              <div className="grid grid-cols-2 gap-4 font-mono text-sm">
                <ConfigRow label="API URL" value={API_URL} />
                <ConfigRow label="Domain" value="heyclaude.xyz" />
                <ConfigRow label="Bot Account" value="@buildheyclaude" />
                <ConfigRow label="Dev Account" value="@buildappsonx" />
              </div>
            </div>

            {/* Links */}
            <div className="bg-[#292524] border border-[#44403c] rounded-xl p-6 md:col-span-2">
              <h2 className="text-lg font-semibold mb-4">External Links</h2>
              <div className="flex flex-wrap gap-3">
                <ExtLink href={`${API_URL}/docs`} label="API Documentation" />
                <ExtLink href="https://railway.app/dashboard" label="Railway Dashboard" />
                <ExtLink href="https://console.anthropic.com" label="Anthropic Console" />
                <ExtLink href="https://developer.twitter.com" label="Twitter Developer" />
                <ExtLink href="https://twitter.com/buildheyclaude" label="@buildheyclaude" />
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-[#44403c] px-6 py-4 text-center text-xs text-[#78716c]">
        HeyClaude Admin Dashboard • Built with Claude
      </footer>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    blue: 'text-blue-400 bg-blue-500/20',
    green: 'text-green-400 bg-green-500/20',
    yellow: 'text-yellow-400 bg-yellow-500/20',
    red: 'text-red-400 bg-red-500/20',
  };
  return (
    <div className="bg-[#292524] border border-[#44403c] rounded-xl p-4">
      <p className="text-xs text-[#78716c] mb-1">{label}</p>
      <p className={`text-3xl font-bold ${colors[color]?.split(' ')[0]}`}>{value}</p>
    </div>
  );
}

function HealthRow({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between p-3 bg-[#1c1917] rounded-lg">
      <span className="text-sm text-[#a8a29e]">{label}</span>
      <span className={`text-sm font-medium ${ok ? 'text-green-400' : 'text-red-400'}`}>
        {ok ? '✓' : '✗'} {value}
      </span>
    </div>
  );
}

function ConfigRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between p-2 bg-[#1c1917] rounded">
      <span className="text-[#78716c]">{label}</span>
      <span className="text-[#a8a29e]">{value}</span>
    </div>
  );
}

function ExtLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="px-4 py-2 bg-[#1c1917] text-[#a8a29e] rounded-lg hover:text-white hover:bg-[#44403c] transition-colors text-sm"
    >
      {label} ↗
    </a>
  );
}
