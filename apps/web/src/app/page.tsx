'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createProject } from '@/lib/api';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Twitter, ImageIcon, Link2, MoreHorizontal, ChevronDown, AlertTriangle
} from 'lucide-react';

const SUGGESTIONS = [
  'Portfolio site',
  'Dashboard with charts',
  'Landing page',
  'Todo app',
];

export default function HomePage() {
  const router = useRouter();
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (text?: string) => {
    const submitPrompt = text || prompt;
    if (!submitPrompt.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await createProject(submitPrompt);
      router.push(`/studio/${result.slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="min-h-screen bg-bg-main flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4">
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
        </Link>
        
        <div className="flex items-center gap-4">
          <Link 
            href="/explore" 
            className="text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            Explore
          </Link>
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
      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-8">
        <div className="w-full max-w-xl flex flex-col items-center">
          {/* Mascot */}
          <div className="mb-8 flex items-center justify-center gap-3">
            <Image
              src="/claude-symbol.svg"
              alt="Claude"
              width={80}
              height={80}
              className="w-20 h-20"
            />
            <span className="text-6xl">👋</span>
          </div>

          {/* Dropdown Buttons */}
          <div className="flex items-center gap-3 mb-6">
            <button className="flex items-center gap-2 px-4 py-2 text-sm text-text-secondary 
                             bg-bg-card border border-border rounded-lg hover:border-accent 
                             hover:text-text-primary transition-colors">
              Recent Projects
              <ChevronDown className="w-4 h-4" />
            </button>
            <button className="flex items-center gap-2 px-4 py-2 text-sm text-text-secondary 
                             bg-bg-card border border-border rounded-lg hover:border-accent 
                             hover:text-text-primary transition-colors">
              New Build
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          {/* Input Box */}
          <div className="w-full mb-4">
            <div className="bg-bg-card border border-border rounded-xl overflow-hidden 
                          focus-within:border-accent transition-colors">
              <textarea 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                rows={3}
                className="w-full bg-transparent text-text-primary placeholder-text-muted 
                         p-4 resize-none focus:outline-none text-base"
                placeholder="Describe the app you want to build..."
              />
              
              <div className="flex items-center justify-between px-4 py-3 border-t border-border-subtle">
                <div className="flex items-center gap-2">
                  <button className="p-2 text-text-muted hover:text-text-secondary hover:bg-bg-hover 
                                   rounded-lg transition-colors">
                    <ImageIcon className="w-5 h-5" />
                  </button>
                  <button className="p-2 text-text-muted hover:text-text-secondary hover:bg-bg-hover 
                                   rounded-lg transition-colors">
                    <Link2 className="w-5 h-5" />
                  </button>
                  <button className="p-2 text-text-muted hover:text-text-secondary hover:bg-bg-hover 
                                   rounded-lg transition-colors">
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                </div>
                
                <button 
                  onClick={() => handleSubmit()}
                  disabled={!prompt.trim() || isLoading}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white 
                           bg-accent hover:bg-accent-hover rounded-lg transition-colors
                           disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent 
                                     rounded-full animate-spin" />
                      Building...
                    </>
                  ) : (
                    <>
                      Ask
                      <span className="text-base">✳</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="w-full mb-4 px-4 py-3 bg-red-500/10 border border-red-500/30 
                          rounded-lg text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Suggestion Chips */}
          <div className="flex items-center gap-2 flex-wrap justify-center mb-8">
            {SUGGESTIONS.map((chip) => (
              <button 
                key={chip}
                onClick={() => handleSubmit(chip)}
                disabled={isLoading}
                className="px-4 py-2 text-sm text-text-secondary bg-bg-card border border-border 
                         rounded-lg hover:border-accent hover:text-text-primary transition-colors
                         disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Warning Banner */}
          <div className="w-full max-w-lg flex items-start gap-3 px-4 py-3 rounded-lg 
                        bg-[rgba(234,88,12,0.1)] border border-accent text-sm">
            <AlertTriangle className="w-5 h-5 text-accent-light flex-shrink-0 mt-0.5" />
            <span className="text-accent-light">
              HeyClaude generates and deploys code publicly. Be mindful of what you build.
            </span>
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
