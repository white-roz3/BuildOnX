'use client';

import { forwardRef, InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <div className="w-full">
        <input
          ref={ref}
          className={cn(
            'w-full px-3 py-2 bg-bg-tertiary border rounded-md',
            'text-text-primary placeholder:text-text-muted text-sm',
            'focus:outline-none focus:ring-1 transition-colors duration-150',
            error
              ? 'border-accent-red focus:border-accent-red focus:ring-accent-red/30'
              : 'border-border-subtle focus:border-border-focus focus:ring-border-focus',
            className
          )}
          {...props}
        />
        {error && (
          <p className="mt-1 text-xs text-accent-red">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

