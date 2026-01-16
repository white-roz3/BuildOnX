'use client';

import { cn } from '@/lib/utils';
import { FileCode, FileJson, FileText, File as FileIcon } from 'lucide-react';

interface FileTabsProps {
  files: string[];
  activeFile?: string;
  onSelect: (file: string) => void;
  className?: string;
}

export function FileTabs({ files, activeFile, onSelect, className }: FileTabsProps) {
  if (files.length === 0) {
    return null;
  }

  return (
    <div className={cn('flex items-center gap-1 px-2 py-2 bg-bg-secondary border-t border-border-subtle overflow-x-auto', className)}>
      <span className="text-xs text-text-tertiary mr-2 flex-shrink-0">› Files</span>
      
      {files.map((file) => (
        <button
          key={file}
          onClick={() => onSelect(file)}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono transition-colors flex-shrink-0',
            activeFile === file
              ? 'bg-bg-tertiary text-text-primary border border-border-default'
              : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
          )}
        >
          <FileTypeIcon filename={file} />
          {file}
        </button>
      ))}

      <div className="flex-1" />
      
      <span className="text-xs text-text-muted flex-shrink-0">
        {files.length} {files.length === 1 ? 'file' : 'files'}
      </span>
    </div>
  );
}

function FileTypeIcon({ filename }: { filename: string }) {
  const ext = filename.split('.').pop()?.toLowerCase();
  
  const iconClass = 'w-3 h-3';
  
  switch (ext) {
    case 'html':
    case 'htm':
      return <FileCode className={cn(iconClass, 'text-accent-orange')} />;
    case 'css':
    case 'scss':
    case 'sass':
      return <FileCode className={cn(iconClass, 'text-accent-blue')} />;
    case 'js':
    case 'ts':
    case 'jsx':
    case 'tsx':
      return <FileCode className={cn(iconClass, 'text-accent-yellow')} />;
    case 'json':
      return <FileJson className={cn(iconClass, 'text-accent-green')} />;
    case 'md':
    case 'txt':
      return <FileText className={cn(iconClass, 'text-text-tertiary')} />;
    default:
      return <FileIcon className={cn(iconClass, 'text-text-tertiary')} />;
  }
}

// Code viewer modal/panel
interface CodeViewerProps {
  filename: string;
  code: string;
  onClose: () => void;
  onSave?: (code: string) => void;
  className?: string;
}

export function CodeViewer({ filename, code, onClose, onSave, className }: CodeViewerProps) {
  const lines = code.split('\n');

  return (
    <div className={cn('flex flex-col bg-bg-secondary border border-border-subtle rounded-lg overflow-hidden', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border-subtle">
        <div className="flex items-center gap-2">
          <FileTypeIcon filename={filename} />
          <span className="text-sm font-mono text-text-primary">{filename}</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-text-tertiary hover:text-text-primary transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Code content */}
      <div className="flex-1 overflow-auto">
        <pre className="text-xs font-mono leading-relaxed">
          {lines.map((line, i) => (
            <div key={i} className="flex hover:bg-bg-tertiary">
              <span className="w-12 px-3 py-0.5 text-right text-text-muted select-none border-r border-border-subtle">
                {i + 1}
              </span>
              <code className="flex-1 px-4 py-0.5 text-text-primary whitespace-pre">
                {line || ' '}
              </code>
            </div>
          ))}
        </pre>
      </div>

      {/* Footer actions */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-border-subtle">
        <div className="flex items-center gap-2">
          <button className="px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary bg-bg-tertiary rounded transition-colors">
            Copy
          </button>
          <button className="px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary bg-bg-tertiary rounded transition-colors">
            Download
          </button>
        </div>
        {onSave && (
          <button
            onClick={() => onSave(code)}
            className="px-3 py-1.5 text-xs font-medium bg-accent-orange text-bg-primary rounded hover:bg-opacity-90 transition-colors"
          >
            Save & Redeploy
          </button>
        )}
      </div>
    </div>
  );
}

