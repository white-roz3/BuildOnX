'use client';

import { cn } from '@/lib/utils';

interface WarningBannerProps {
  children: React.ReactNode;
  className?: string;
}

export function WarningBanner({ children, className }: WarningBannerProps) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 px-4 py-3 rounded-lg',
        'bg-accent-yellow/10 border border-accent-yellow',
        className
      )}
    >
      <svg 
        className="w-5 h-5 text-accent-yellow flex-shrink-0 mt-0.5" 
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
        />
      </svg>
      <span className="text-sm text-accent-yellow">{children}</span>
    </div>
  );
}
