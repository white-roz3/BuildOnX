"use client";

import { useBuildUpdates } from "@/lib/useBuildUpdates";
import { Loader2, CheckCircle, XCircle, Zap } from "lucide-react";

interface BuildProgressProps {
  buildId: string;
  onComplete?: (data: { url?: string; slug?: string }) => void;
  onError?: (error: string) => void;
}

export function BuildProgress({ buildId, onComplete, onError }: BuildProgressProps) {
  const { status, message, progress, isConnected } = useBuildUpdates(buildId, {
    onComplete,
    onError,
  });

  const getStatusIcon = () => {
    switch (status) {
      case "complete":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "failed":
        return <XCircle className="w-5 h-5 text-red-500" />;
      case "idle":
      case "connecting":
        return <Zap className="w-5 h-5 text-gray-500" />;
      default:
        return <Loader2 className="w-5 h-5 text-green-500 animate-spin" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case "complete":
        return "bg-green-500";
      case "failed":
        return "bg-red-500";
      default:
        return "bg-green-500";
    }
  };

  return (
    <div className="w-full max-w-md p-6 bg-zinc-900 border border-zinc-800 rounded-lg">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        {getStatusIcon()}
        <div>
          <p className="font-medium">
            {status === "complete"
              ? "Build Complete!"
              : status === "failed"
              ? "Build Failed"
              : "Building..."}
          </p>
          <p className="text-sm text-zinc-400">{message}</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ease-out ${getStatusColor()}`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Progress Text */}
      <div className="flex justify-between mt-2 text-xs text-zinc-500">
        <span>{progress}%</span>
        <span>
          {isConnected ? (
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
              Live
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full" />
              Connecting...
            </span>
          )}
        </span>
      </div>

      {/* Steps */}
      <div className="mt-4 space-y-2">
        {[
          { key: "generating", label: "Generating code", threshold: 20 },
          { key: "generated", label: "Code ready", threshold: 50 },
          { key: "deploying", label: "Deploying", threshold: 70 },
          { key: "complete", label: "Live!", threshold: 100 },
        ].map((step) => (
          <div
            key={step.key}
            className={`flex items-center gap-2 text-sm ${
              progress >= step.threshold ? "text-green-500" : "text-zinc-600"
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                progress >= step.threshold
                  ? "border-green-500 bg-green-500/20"
                  : "border-zinc-700"
              }`}
            >
              {progress >= step.threshold && (
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
              )}
            </div>
            {step.label}
          </div>
        ))}
      </div>
    </div>
  );
}

