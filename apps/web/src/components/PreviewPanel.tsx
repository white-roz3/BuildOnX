'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { RefreshCw, Maximize2, ExternalLink, Copy, Check } from 'lucide-react';

interface PreviewPanelProps {
  url?: string;
  isLoading?: boolean;
  className?: string;
}

export function PreviewPanel({ url, isLoading, className }: PreviewPanelProps) {
  const [iframeKey, setIframeKey] = useState(0);
  const [copied, setCopied] = useState(false);

  const handleRefresh = () => {
    setIframeKey((k) => k + 1);
  };

  const handleFullscreen = () => {
    if (url) {
      window.open(url, '_blank');
    }
  };

  const handleCopyUrl = async () => {
    if (url) {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className={cn('flex flex-col h-full bg-bg-secondary rounded-lg overflow-hidden', className)}>
      {/* Preview header */}
      <div className="flex-shrink-0 px-4 py-2 border-b border-border-subtle">
        <span className="text-xs font-medium text-text-secondary uppercase tracking-wide">Preview</span>
      </div>

      {/* Preview iframe */}
      <div className="flex-1 relative bg-white">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-bg-tertiary">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-accent-orange border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-text-secondary">Building your app...</span>
            </div>
          </div>
        ) : url ? (
          <iframe
            key={iframeKey}
            src={url}
            className="w-full h-full border-0"
            title="App Preview"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-bg-tertiary">
            <div className="text-center">
              <p className="text-text-secondary text-sm">No preview available</p>
              <p className="text-text-muted text-xs mt-1">Submit a prompt to start building</p>
            </div>
          </div>
        )}
      </div>

      {/* URL bar and controls */}
      <div className="flex-shrink-0 px-3 py-2 border-t border-border-subtle flex items-center gap-2">
        <div className="flex-1 flex items-center gap-2 px-3 py-1.5 bg-bg-tertiary rounded-md">
          <span className="text-xs text-text-muted truncate font-mono">
            {url || 'https://heyclaude.xyz/p/...'}
          </span>
          {url && (
            <button
              onClick={handleCopyUrl}
              className="flex-shrink-0 p-1 text-text-tertiary hover:text-text-secondary transition-colors"
              title="Copy URL"
            >
              {copied ? (
                <Check className="w-3 h-3 text-accent-green" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </button>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleRefresh}
            disabled={!url}
            className="p-2 text-text-tertiary hover:text-text-secondary hover:bg-bg-tertiary rounded-md transition-colors disabled:opacity-40"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleFullscreen}
            disabled={!url}
            className="p-2 text-text-tertiary hover:text-text-secondary hover:bg-bg-tertiary rounded-md transition-colors disabled:opacity-40"
            title="Open in new tab"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

