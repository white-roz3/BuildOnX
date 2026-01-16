'use client';

import { cn } from '@/lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  className?: string;
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  const variants = {
    default: 'bg-bg-tertiary text-text-secondary border-border-subtle',
    success: 'bg-accent-green/15 text-accent-green border-accent-green/40',
    warning: 'bg-accent-yellow/15 text-accent-yellow border-accent-yellow/40',
    error: 'bg-accent-red/15 text-accent-red border-accent-red/40',
    info: 'bg-accent-blue/15 text-accent-blue border-accent-blue/40',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-md border',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
