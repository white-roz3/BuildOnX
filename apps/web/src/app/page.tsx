"use client";

import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-claude-bg flex flex-col">
      {/* Header */}
      <header className="w-full px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-claude-orange">
              <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" fill="currentColor"/>
            </svg>
            <span className="text-claude-text font-semibold text-lg">HeyClaude</span>
          </div>
          <nav className="flex items-center gap-6">
            <Link href="/explore" className="text-claude-text-secondary hover:text-claude-text transition-colors text-sm">
              Explore
            </Link>
            <Link href="/admin" className="text-claude-text-secondary hover:text-claude-text transition-colors text-sm">
              Admin
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 -mt-20">
        {/* Pixel Art Icon */}
        <div className="mb-8 animate-fade-in">
          <svg width="80" height="64" viewBox="0 0 80 64" fill="none" className="text-claude-orange">
            {/* Pixel art creature similar to Claude's */}
            <rect x="24" y="8" width="8" height="8" fill="currentColor"/>
            <rect x="48" y="8" width="8" height="8" fill="currentColor"/>
            <rect x="16" y="16" width="48" height="8" fill="currentColor"/>
            <rect x="8" y="24" width="64" height="8" fill="currentColor"/>
            <rect x="8" y="32" width="64" height="8" fill="currentColor"/>
            <rect x="16" y="40" width="16" height="8" fill="currentColor"/>
            <rect x="48" y="40" width="16" height="8" fill="currentColor"/>
            <rect x="24" y="24" width="8" height="8" fill="#0d0d0d"/>
            <rect x="48" y="24" width="8" height="8" fill="#0d0d0d"/>
          </svg>
        </div>

        {/* Hero Text */}
        <h1 className="text-5xl md:text-7xl font-semibold text-claude-text mb-6 animate-slide-up font-display tracking-tight">
          HeyClaude
        </h1>
        
        <p className="text-xl md:text-2xl text-claude-text-secondary text-center max-w-xl mb-12 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          Build apps with a tweet. Just @ us.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <a
            href="https://x.com/buildheyclaude"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 bg-claude-orange text-claude-bg font-medium rounded-lg hover:bg-claude-orange-light transition-colors text-center"
          >
            Try on Twitter
          </a>
          <Link
            href="/explore"
            className="px-6 py-3 bg-claude-surface-elevated text-claude-text font-medium rounded-lg hover:bg-claude-border transition-colors text-center border border-claude-border"
          >
            Explore Projects
          </Link>
        </div>
      </main>

      {/* Features Section */}
      <section className="w-full px-6 py-20 border-t border-claude-border">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 flex items-center justify-center bg-claude-surface-elevated rounded-lg">
                <span className="text-2xl">🚀</span>
              </div>
              <h3 className="text-lg font-medium text-claude-text mb-2">Instant</h3>
              <p className="text-claude-text-secondary text-sm">
                Get your app deployed in 30-60 seconds. No setup required.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 flex items-center justify-center bg-claude-surface-elevated rounded-lg">
                <span className="text-2xl">🤖</span>
              </div>
              <h3 className="text-lg font-medium text-claude-text mb-2">AI-Powered</h3>
              <p className="text-claude-text-secondary text-sm">
                Powered by Claude AI for production-ready applications.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 flex items-center justify-center bg-claude-surface-elevated rounded-lg">
                <span className="text-2xl">✏️</span>
              </div>
              <h3 className="text-lg font-medium text-claude-text mb-2">Editable</h3>
              <p className="text-claude-text-secondary text-sm">
                Refine and customize through our web-based studio.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full px-6 py-6 border-t border-claude-border">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-claude-text-tertiary text-xs">
            © 2026 HeyClaude · CA: FeuQgovgEifmohDj2PdMV4NLAhqzdCytubsys3vVpump
          </p>
        </div>
      </footer>
    </div>
  );
}
