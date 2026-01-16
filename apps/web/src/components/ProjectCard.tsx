'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Eye, ExternalLink } from 'lucide-react';

interface ProjectCardProps {
  slug: string;
  name: string;
  description?: string;
  screenshot?: string;
  author?: string;
  views?: number;
  status?: 'live' | 'building' | 'error';
  className?: string;
}

export function ProjectCard({
  slug,
  name,
  description,
  screenshot,
  author,
  views,
  status = 'live',
  className,
}: ProjectCardProps) {
  return (
    <Link
      href={`/p/${slug}`}
      className={cn(
        'group flex flex-col bg-bg-secondary border border-border-subtle rounded-xl overflow-hidden',
        'hover:border-accent-orange hover:shadow-card-hover transition-all duration-200',
        className
      )}
    >
      {/* Screenshot / Preview */}
      <div className="relative aspect-video bg-bg-tertiary overflow-hidden">
        {screenshot ? (
          <img
            src={screenshot}
            alt={name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-14 h-14 rounded-xl bg-bg-elevated flex items-center justify-center">
              <span className="text-2xl">🚀</span>
            </div>
          </div>
        )}

        {/* Status badge */}
        {status && (
          <div className="absolute top-3 right-3">
            <StatusBadge status={status} />
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-bg-primary/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <span className="flex items-center gap-2 px-4 py-2 bg-accent-orange text-white text-sm font-semibold rounded-lg shadow-button">
            View Project
            <ExternalLink className="w-4 h-4" />
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="text-sm font-semibold text-text-primary truncate mb-1">{name}</h3>
        {description && (
          <p className="text-xs text-text-secondary line-clamp-2 mb-3">{description}</p>
        )}

        <div className="flex items-center justify-between">
          {author && (
            <span className="text-xs text-text-muted">{author}</span>
          )}
          {views !== undefined && (
            <span className="flex items-center gap-1 text-xs text-text-muted">
              <Eye className="w-3.5 h-3.5" />
              {formatViews(views)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

function StatusBadge({ status }: { status: 'live' | 'building' | 'error' }) {
  const styles = {
    live: 'bg-accent-green/20 text-accent-green border-accent-green/40',
    building: 'bg-accent-yellow/20 text-accent-yellow border-accent-yellow/40',
    error: 'bg-accent-red/20 text-accent-red border-accent-red/40',
  };

  const labels = {
    live: 'Live',
    building: 'Building',
    error: 'Error',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md border',
        styles[status]
      )}
    >
      <span
        className={cn(
          'w-1.5 h-1.5 rounded-full',
          status === 'live' && 'bg-accent-green',
          status === 'building' && 'bg-accent-yellow animate-pulse',
          status === 'error' && 'bg-accent-red'
        )}
      />
      {labels[status]}
    </span>
  );
}

function formatViews(views: number): string {
  if (views >= 1000000) {
    return `${(views / 1000000).toFixed(1)}M`;
  }
  if (views >= 1000) {
    return `${(views / 1000).toFixed(1)}K`;
  }
  return views.toString();
}
