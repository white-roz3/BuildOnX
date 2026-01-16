'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Twitter } from 'lucide-react';

interface HeaderProps {
  showSearch?: boolean;
  showNewBuild?: boolean;
  projectName?: string;
  className?: string;
}

// Pixel Alien SVG Component
function PixelAlien({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("w-8 h-8", className)}>
      <rect x="12" y="4" width="2" height="2" fill="#a8c686"/>
      <rect x="18" y="4" width="2" height="2" fill="#a8c686"/>
      <rect x="10" y="6" width="2" height="2" fill="#a8c686"/>
      <rect x="14" y="6" width="4" height="2" fill="#a8c686"/>
      <rect x="20" y="6" width="2" height="2" fill="#a8c686"/>
      <rect x="8" y="8" width="16" height="2" fill="#a8c686"/>
      <rect x="6" y="10" width="20" height="6" fill="#a8c686"/>
      <rect x="8" y="10" width="4" height="4" fill="#1e1e1e"/>
      <rect x="20" y="10" width="4" height="4" fill="#1e1e1e"/>
      <rect x="9" y="11" width="2" height="2" fill="#ffffff"/>
      <rect x="21" y="11" width="2" height="2" fill="#ffffff"/>
      <rect x="8" y="16" width="16" height="2" fill="#a8c686"/>
      <rect x="10" y="18" width="4" height="2" fill="#a8c686"/>
      <rect x="18" y="18" width="4" height="2" fill="#a8c686"/>
      <rect x="8" y="20" width="2" height="4" fill="#a8c686"/>
      <rect x="22" y="20" width="2" height="4" fill="#a8c686"/>
    </svg>
  );
}

export function Header({ showSearch, showNewBuild = true, projectName, className }: HeaderProps) {
  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full h-14 px-6',
        'bg-bg-primary/95 backdrop-blur-sm border-b border-border-subtle',
        'flex items-center justify-between',
        className
      )}
    >
      {/* Left - Logo */}
      <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
        <PixelAlien />
        <span className="logo-text text-xl text-text-primary">HEYCLAUDE</span>
      </Link>

      {/* Center - Project name if provided */}
      {projectName && (
        <div className="absolute left-1/2 -translate-x-1/2">
          <span className="text-sm text-text-secondary font-mono">{projectName}</span>
        </div>
      )}

      {/* Right - Actions */}
      <div className="flex items-center gap-4">
        {showSearch && (
          <div className="relative">
            <input
              type="text"
              placeholder="Search..."
              className="w-48 px-4 py-2 text-sm bg-bg-tertiary border border-border-subtle rounded-lg
                       text-text-primary placeholder:text-text-placeholder
                       focus:outline-none focus:border-accent-orange"
            />
          </div>
        )}
        
        <Link
          href="/explore"
          className="text-sm text-text-secondary hover:text-text-primary transition-colors font-medium"
        >
          Explore
        </Link>
        
        {showNewBuild && (
          <Link
            href="/"
            className="px-4 py-2 text-sm font-semibold bg-accent-orange text-white rounded-lg
                     hover:bg-accent-orange-hover transition-colors shadow-button"
          >
            New Build
          </Link>
        )}

        <a
          href="https://twitter.com/buildheyclaude"
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 text-text-secondary hover:text-accent-orange transition-colors"
        >
          <Twitter className="w-5 h-5" />
        </a>
      </div>
    </header>
  );
}

export { PixelAlien };
