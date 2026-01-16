'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Check, Loader2 } from 'lucide-react';

export interface BuildStep {
  id: string;
  type: 'message' | 'task' | 'error' | 'success';
  content: string;
  status: 'pending' | 'running' | 'complete' | 'error';
  toolsUsed?: number;
  timestamp?: Date;
}

interface BuildTerminalProps {
  steps: BuildStep[];
  isBuilding?: boolean;
  className?: string;
}

export function BuildTerminal({ steps, isBuilding, className }: BuildTerminalProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new steps are added
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [steps]);

  return (
    <div
      ref={scrollRef}
      className={cn(
        'flex flex-col gap-3 p-4 overflow-y-auto h-full',
        'font-mono text-sm',
        className
      )}
    >
      {steps.map((step) => (
        <BuildStepItem key={step.id} step={step} />
      ))}

      {isBuilding && steps.length > 0 && (
        <div className="flex items-center gap-2 text-accent-orange animate-pulse-soft">
          <span className="inline-block w-4 h-4 animate-manifest">✻</span>
          <span>Manifesting...</span>
        </div>
      )}

      {steps.length === 0 && !isBuilding && (
        <div className="flex flex-col items-center justify-center h-full text-text-muted">
          <p className="text-center">Waiting for build to start...</p>
        </div>
      )}
    </div>
  );
}

function BuildStepItem({ step }: { step: BuildStep }) {
  if (step.type === 'message') {
    return (
      <div className="flex gap-2">
        <BulletPoint status={step.status} />
        <span className="text-text-primary leading-relaxed">{step.content}</span>
      </div>
    );
  }

  if (step.type === 'task') {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-start gap-2">
          <BulletPoint status={step.status} />
          <div className="flex flex-col">
            <span className="text-accent-orange font-medium">Task: {step.content}</span>
            {step.toolsUsed !== undefined && step.status === 'complete' && (
              <span className="text-text-tertiary text-xs ml-4">
                └ Used {step.toolsUsed} tools
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (step.type === 'error') {
    return (
      <div className="flex gap-2">
        <span className="text-accent-red">✕</span>
        <span className="text-accent-red">{step.content}</span>
      </div>
    );
  }

  if (step.type === 'success') {
    return (
      <div className="flex gap-2">
        <span className="text-accent-green">✓</span>
        <span className="text-accent-green font-medium">{step.content}</span>
      </div>
    );
  }

  return null;
}

function BulletPoint({ status }: { status: BuildStep['status'] }) {
  if (status === 'running') {
    return (
      <Loader2 className="w-4 h-4 text-accent-orange animate-spin flex-shrink-0 mt-0.5" />
    );
  }

  if (status === 'complete') {
    return (
      <span className="w-4 h-4 flex items-center justify-center flex-shrink-0 mt-0.5">
        <span className="w-1.5 h-1.5 rounded-full bg-accent-green" />
      </span>
    );
  }

  if (status === 'error') {
    return (
      <span className="w-4 h-4 flex items-center justify-center flex-shrink-0 mt-0.5 text-accent-red">
        ✕
      </span>
    );
  }

  return (
    <span className="w-4 h-4 flex items-center justify-center flex-shrink-0 mt-0.5">
      <span className="w-1.5 h-1.5 rounded-full bg-text-tertiary" />
    </span>
  );
}

// Simple inline status indicator
export function StatusDot({ status }: { status: 'running' | 'success' | 'error' | 'pending' }) {
  const colors = {
    running: 'bg-accent-green animate-pulse',
    success: 'bg-accent-green',
    error: 'bg-accent-red',
    pending: 'bg-accent-yellow',
  };

  return (
    <span className={cn('inline-block w-2 h-2 rounded-full', colors[status])} />
  );
}

