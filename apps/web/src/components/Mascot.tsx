'use client';

import { cn } from '@/lib/utils';

interface MascotProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  animated?: boolean;
}

export function Mascot({ size = 'md', className, animated = true }: MascotProps) {
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-20 h-20',
  };

  // Green pixel alien - rendered as CSS art
  return (
    <div className={cn('relative', sizes[size], className)}>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className={cn('w-full h-full', animated && 'animate-pulse-soft')}
      >
        {/* Pixel alien design */}
        <rect x="8" y="2" width="2" height="2" fill="#a8c686" />
        <rect x="14" y="2" width="2" height="2" fill="#a8c686" />
        <rect x="6" y="4" width="2" height="2" fill="#a8c686" />
        <rect x="10" y="4" width="4" height="2" fill="#a8c686" />
        <rect x="16" y="4" width="2" height="2" fill="#a8c686" />
        <rect x="4" y="6" width="16" height="2" fill="#a8c686" />
        <rect x="2" y="8" width="20" height="4" fill="#a8c686" />
        {/* Eyes */}
        <rect x="6" y="8" width="4" height="4" fill="#1a1a1a" />
        <rect x="14" y="8" width="4" height="4" fill="#1a1a1a" />
        {/* Eye highlights */}
        <rect x="7" y="9" width="2" height="2" fill="#ffffff" />
        <rect x="15" y="9" width="2" height="2" fill="#ffffff" />
        <rect x="4" y="12" width="16" height="2" fill="#a8c686" />
        <rect x="6" y="14" width="4" height="2" fill="#a8c686" />
        <rect x="14" y="14" width="4" height="2" fill="#a8c686" />
        <rect x="4" y="16" width="2" height="4" fill="#a8c686" />
        <rect x="18" y="16" width="2" height="4" fill="#a8c686" />
      </svg>
    </div>
  );
}

// Alternative simple green circle mascot
export function MascotSimple({ size = 'md', className, animated = true }: MascotProps) {
  const sizes = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
  };

  return (
    <div
      className={cn(
        'rounded-full bg-accent-green flex items-center justify-center',
        sizes[size],
        animated && 'animate-pulse-soft',
        className
      )}
    >
      <span className="text-bg-primary font-bold text-lg">✦</span>
    </div>
  );
}

