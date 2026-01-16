'use client';

import { useState, KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';
import { Image, Link2, MoreHorizontal, Sparkles } from 'lucide-react';

interface PromptInputProps {
  placeholder?: string;
  onSubmit: (prompt: string) => void;
  disabled?: boolean;
  isLoading?: boolean;
  className?: string;
  size?: 'sm' | 'lg';
}

export function PromptInput({
  placeholder = "Describe the app you want to build...",
  onSubmit,
  disabled,
  isLoading,
  className,
  size = 'lg',
}: PromptInputProps) {
  const [value, setValue] = useState('');

  const handleSubmit = () => {
    if (value.trim() && !disabled && !isLoading) {
      onSubmit(value.trim());
      setValue('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const isLarge = size === 'lg';

  return (
    <div className={cn(
      'w-full bg-bg-secondary rounded-xl border border-border-subtle shadow-card',
      isLarge ? 'p-5' : 'p-4',
      className
    )}>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled || isLoading}
        rows={isLarge ? 4 : 2}
        className={cn(
          'w-full bg-bg-tertiary border border-border-subtle rounded-lg px-4 py-3',
          'text-text-primary placeholder:text-text-placeholder',
          'focus:outline-none focus:border-accent-orange focus:ring-1 focus:ring-accent-orange',
          'transition-all duration-200 resize-none shadow-input',
          isLarge ? 'text-base' : 'text-sm'
        )}
      />

      {/* Bottom toolbar */}
      <div className="flex items-center justify-between mt-4">
        {/* Left actions */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="p-2.5 text-text-muted hover:text-text-secondary hover:bg-bg-tertiary rounded-lg transition-colors"
            title="Upload image"
          >
            <Image className="w-5 h-5" />
          </button>
          <button
            type="button"
            className="p-2.5 text-text-muted hover:text-text-secondary hover:bg-bg-tertiary rounded-lg transition-colors"
            title="Add link"
          >
            <Link2 className="w-5 h-5" />
          </button>
          <button
            type="button"
            className="p-2.5 text-text-muted hover:text-text-secondary hover:bg-bg-tertiary rounded-lg transition-colors"
            title="More options"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>

        {/* Submit button */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!value.trim() || disabled || isLoading}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm
                   bg-accent-orange text-white shadow-button
                   hover:bg-accent-orange-hover
                   disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none
                   transition-all duration-200"
        >
          {isLoading ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Building...
            </>
          ) : (
            <>
              Ask
              <Sparkles className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// Smaller reply input for studio
export function ReplyInput({
  placeholder = "Describe changes you want to make...",
  onSubmit,
  disabled,
  isLoading,
  className,
}: Omit<PromptInputProps, 'size'>) {
  const [value, setValue] = useState('');

  const handleSubmit = () => {
    if (value.trim() && !disabled && !isLoading) {
      onSubmit(value.trim());
      setValue('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className={cn(
      'w-full bg-bg-tertiary border border-border-subtle rounded-lg p-3',
      className
    )}>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled || isLoading}
        rows={2}
        className="w-full bg-transparent text-sm text-text-primary placeholder:text-text-placeholder 
                 focus:outline-none resize-none"
      />

      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="p-2 text-text-muted hover:text-text-secondary hover:bg-bg-elevated rounded transition-colors"
          >
            <Image className="w-4 h-4" />
          </button>
          <button
            type="button"
            className="p-2 text-text-muted hover:text-text-secondary hover:bg-bg-elevated rounded transition-colors"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!value.trim() || disabled || isLoading}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold
                   bg-accent-orange text-white
                   hover:bg-accent-orange-hover
                   disabled:opacity-50 disabled:cursor-not-allowed
                   transition-all duration-200"
        >
          {isLoading ? (
            <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Sparkles className="w-3.5 h-3.5" />
          )}
          Ask
        </button>
      </div>
    </div>
  );
}
