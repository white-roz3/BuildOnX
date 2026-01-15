"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const API_URL = typeof window !== "undefined" && window.location.hostname !== "localhost"
  ? "https://heyclaude-api-production.up.railway.app"
  : (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000");

export default function AdminPage() {
  const [mentions, setMentions] = useState<any[]>([]);
  const [queue, setQueue] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API_URL}/api/admin/mentions`);
        const data = await res.json();
        setMentions(data.mentions || []);
        setQueue(data.queue || []);
        setStats(data.stats || {});
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleDeploy = async (tweetId: string) => {
    try {
      await fetch(`${API_URL}/api/admin/deploy/${tweetId}`, { method: "POST" });
      setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-claude-bg">
      {/* Header */}
      <header className="w-full px-6 py-4 border-b border-claude-border">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-claude-orange">
              <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" fill="currentColor"/>
            </svg>
            <span className="text-claude-text font-semibold text-lg">HeyClaude</span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/explore" className="text-claude-text-secondary hover:text-claude-text transition-colors text-sm">
              Explore
            </Link>
            <Link href="/admin" className="text-claude-text text-sm font-medium">
              Admin
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        <h1 className="text-3xl font-semibold text-claude-text mb-8">Admin Dashboard</h1>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-claude-surface p-4 rounded-lg border border-claude-border">
              <div className="text-sm text-claude-text-secondary mb-1">Total Mentions</div>
              <div className="text-2xl font-semibold text-claude-text">{stats.total_mentions || 0}</div>
            </div>
            <div className="bg-claude-surface p-4 rounded-lg border border-claude-border">
              <div className="text-sm text-claude-text-secondary mb-1">Pending</div>
              <div className="text-2xl font-semibold text-claude-orange">{stats.pending || 0}</div>
            </div>
            <div className="bg-claude-surface p-4 rounded-lg border border-claude-border">
              <div className="text-sm text-claude-text-secondary mb-1">Processing</div>
              <div className="text-2xl font-semibold text-yellow-500">{stats.processing || 0}</div>
            </div>
            <div className="bg-claude-surface p-4 rounded-lg border border-claude-border">
              <div className="text-sm text-claude-text-secondary mb-1">Rate Limit</div>
              <div className="text-2xl font-semibold text-claude-text">{stats.rate_limit_remaining || 0}</div>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Mentions */}
          <div>
            <h2 className="text-xl font-semibold text-claude-text mb-4">Mentions</h2>
            <div className="space-y-3">
              {loading ? (
                <div className="text-claude-text-secondary">Loading...</div>
              ) : mentions.length === 0 ? (
                <div className="text-claude-text-tertiary py-8 text-center">No mentions</div>
              ) : (
                mentions.map((mention) => (
                  <div key={mention.tweet_id} className="bg-claude-surface p-4 rounded-lg border border-claude-border">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0 mr-3">
                        <div className="font-medium text-claude-orange text-sm">@{mention.author_username}</div>
                        <div className="text-sm text-claude-text-secondary mt-1 break-words">{mention.text}</div>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs shrink-0 ${
                        mention.status === "replied" ? "bg-green-900/30 text-green-400 border border-green-800" :
                        mention.status === "processing" ? "bg-yellow-900/30 text-yellow-400 border border-yellow-800" :
                        mention.status === "failed" ? "bg-red-900/30 text-red-400 border border-red-800" :
                        "bg-claude-surface-elevated text-claude-text-secondary border border-claude-border"
                      }`}>
                        {mention.status}
                      </span>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => handleDeploy(mention.tweet_id)}
                        className="px-3 py-1.5 bg-claude-orange text-claude-bg rounded text-sm font-medium hover:bg-claude-orange-light transition-colors"
                      >
                        Deploy
                      </button>
                      {mention.deployment_url && (
                        <a
                          href={mention.deployment_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 bg-claude-surface-elevated text-claude-text-secondary rounded text-sm hover:bg-claude-border transition-colors border border-claude-border"
                        >
                          View ↗
                        </a>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Queue */}
          <div>
            <h2 className="text-xl font-semibold text-claude-text mb-4">Queue</h2>
            <div className="space-y-3">
              {queue.length === 0 ? (
                <div className="text-claude-text-tertiary py-8 text-center bg-claude-surface rounded-lg border border-claude-border">
                  Queue is empty
                </div>
              ) : (
                queue.map((item) => (
                  <div key={item.tweet_id} className="bg-claude-surface p-4 rounded-lg border border-claude-border">
                    <div className="font-medium text-claude-text text-sm">Tweet {item.tweet_id}</div>
                    <div className="text-sm text-claude-text-secondary mt-1">Status: {item.status}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
