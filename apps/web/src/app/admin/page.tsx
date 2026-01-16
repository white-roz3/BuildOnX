'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { API_URL } from '@/lib/api';
import { 
  RefreshCw, ExternalLink, Play, Activity, Clock, CheckCircle, AlertCircle, Twitter
} from 'lucide-react';

interface Mention {
  tweet_id: string;
  author_username: string;
  text: string;
  status: string;
  deployment_url?: string;
}

interface Stats {
  total_mentions: number;
  pending: number;
  processing: number;
  replied: number;
  rate_limit_remaining: number;
}

export default function AdminPage() {
  const [mentions, setMentions] = useState<Mention[]>([]);
  const [queue, setQueue] = useState<Mention[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadData = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/mentions`);
      const data = await res.json();
      setMentions(data.mentions || []);
      setQueue(data.queue || []);
      setStats(data.stats || null);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleDeploy = async (tweetId: string) => {
    try {
      await fetch(`${API_URL}/api/admin/deploy/${tweetId}`, { method: 'POST' });
      setTimeout(loadData, 1000);
    } catch (err) {
      console.error('Deploy failed:', err);
    }
  };

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
          <span className="text-text-muted">/</span>
          <span className="text-text-secondary">Admin</span>
        </Link>
        
        <div className="flex items-center gap-4">
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-text-primary
                     bg-bg-card border border-border rounded-lg hover:border-accent 
                     transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
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
          <h1 className="text-3xl font-display font-bold text-text-primary mb-1">Admin Dashboard</h1>
          {lastUpdated && (
            <p className="text-text-muted text-sm">Last updated: {lastUpdated.toLocaleTimeString()}</p>
          )}
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <StatCard label="Total Mentions" value={stats.total_mentions} icon={<Activity className="w-5 h-5" />} />
            <StatCard label="Pending" value={stats.pending} icon={<Clock className="w-5 h-5" />} variant="warning" />
            <StatCard label="Processing" value={stats.processing} icon={<RefreshCw className="w-5 h-5" />} />
            <StatCard label="Replied" value={stats.replied} icon={<CheckCircle className="w-5 h-5" />} variant="success" />
            <StatCard label="Rate Limit" value={stats.rate_limit_remaining} icon={<AlertCircle className="w-5 h-5" />} />
          </div>
        )}

        {/* Two Column Layout */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Mentions */}
          <div>
            <h2 className="text-lg font-display font-semibold text-text-primary mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-status-live" />
              Mentions
            </h2>
            
            <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                </div>
              ) : mentions.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-text-muted">No mentions yet</p>
                </div>
              ) : (
                <div className="divide-y divide-border-subtle">
                  {mentions.map((mention) => (
                    <MentionCard key={mention.tweet_id} mention={mention} onDeploy={handleDeploy} />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Queue */}
          <div>
            <h2 className="text-lg font-display font-semibold text-text-primary mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              Processing Queue
            </h2>
            
            <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
              {queue.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-text-muted">Queue is empty</p>
                </div>
              ) : (
                <div className="divide-y divide-border-subtle">
                  {queue.map((item) => (
                    <div key={item.tweet_id} className="p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-mono text-text-secondary">{item.tweet_id.slice(0, 12)}...</span>
                        <span className="bg-accent/20 text-accent text-xs font-semibold px-2 py-0.5 rounded">
                          {item.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
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

function StatCard({ label, value, icon, variant }: { 
  label: string; value: number; icon: React.ReactNode; variant?: 'success' | 'warning' | 'error';
}) {
  const colors = {
    success: 'text-status-live',
    warning: 'text-accent',
    error: 'text-status-error',
  };

  return (
    <div className="bg-bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className={variant ? colors[variant] : 'text-text-muted'}>{icon}</span>
        <span className="text-sm text-text-muted">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${variant ? colors[variant] : 'text-text-primary'}`}>{value}</div>
    </div>
  );
}

function MentionCard({ mention, onDeploy }: { mention: Mention; onDeploy: (id: string) => void }) {
  const statusStyles: Record<string, string> = {
    replied: 'bg-status-live/20 text-status-live',
    processing: 'bg-accent/20 text-accent',
    failed: 'bg-status-error/20 text-status-error',
    pending: 'bg-bg-hover text-text-secondary',
  };

  return (
    <div className="p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <span className="text-sm font-semibold text-accent">@{mention.author_username}</span>
          <p className="text-sm text-text-secondary mt-1 break-words">{mention.text}</p>
        </div>
        <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-md ${statusStyles[mention.status] || statusStyles.pending}`}>
          {mention.status}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onDeploy(mention.tweet_id)}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold 
                   bg-accent hover:bg-accent-hover text-white rounded-lg transition-colors"
        >
          <Play className="w-3.5 h-3.5" /> Deploy
        </button>
        {mention.deployment_url && (
          <a
            href={mention.deployment_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium 
                     text-text-secondary bg-bg-hover border border-border rounded-lg 
                     hover:border-accent hover:text-text-primary transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" /> View
          </a>
        )}
      </div>
    </div>
  );
}
