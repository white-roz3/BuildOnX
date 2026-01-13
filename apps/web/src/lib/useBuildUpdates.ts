/**
 * React hook for real-time build updates via WebSocket.
 */

import { useState, useEffect, useCallback, useRef } from "react";

interface BuildUpdate {
  build_id: string;
  status: string;
  message: string;
  progress: number;
  data?: Record<string, unknown>;
}

interface UseBuildUpdatesOptions {
  onComplete?: (data: Record<string, unknown>) => void;
  onError?: (error: string) => void;
}

export function useBuildUpdates(
  buildId: string | null,
  options: UseBuildUpdatesOptions = {}
) {
  const [status, setStatus] = useState<string>("idle");
  const [message, setMessage] = useState<string>("");
  const [progress, setProgress] = useState<number>(0);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (!buildId) return;

    // Determine WebSocket URL
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = process.env.NEXT_PUBLIC_WS_URL || window.location.host;
    const wsUrl = `${protocol}//${host}/ws/build/${buildId}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      console.log(`[WS] Connected to build ${buildId}`);

      // Send ping every 30 seconds to keep connection alive
      pingIntervalRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send("ping");
        }
      }, 30000);
    };

    ws.onmessage = (event) => {
      // Handle pong
      if (event.data === "pong") return;

      try {
        const update: BuildUpdate = JSON.parse(event.data);
        
        setStatus(update.status);
        setMessage(update.message);
        setProgress(update.progress);

        // Handle completion
        if (update.status === "complete" && options.onComplete) {
          options.onComplete(update.data || {});
        }

        // Handle failure
        if (update.status === "failed" && options.onError) {
          options.onError(update.message);
        }
      } catch (e) {
        console.error("[WS] Failed to parse message:", e);
      }
    };

    ws.onerror = (error) => {
      console.error("[WS] Error:", error);
    };

    ws.onclose = () => {
      setIsConnected(false);
      console.log(`[WS] Disconnected from build ${buildId}`);
      
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
    };
  }, [buildId, options]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
    }
  }, []);

  // Connect when buildId changes
  useEffect(() => {
    if (buildId) {
      connect();
    }
    return () => disconnect();
  }, [buildId, connect, disconnect]);

  // Reset state when buildId changes
  useEffect(() => {
    if (buildId) {
      setStatus("connecting");
      setMessage("Connecting...");
      setProgress(0);
    } else {
      setStatus("idle");
      setMessage("");
      setProgress(0);
    }
  }, [buildId]);

  return {
    status,
    message,
    progress,
    isConnected,
    disconnect,
  };
}

/**
 * Example usage in a component:
 * 
 * function BuildProgress({ buildId }: { buildId: string }) {
 *   const { status, message, progress, isConnected } = useBuildUpdates(buildId, {
 *     onComplete: (data) => {
 *       console.log('Build complete!', data.url);
 *       router.push(`/p/${data.slug}`);
 *     },
 *     onError: (error) => {
 *       toast.error(`Build failed: ${error}`);
 *     },
 *   });
 * 
 *   return (
 *     <div>
 *       <div className="text-sm text-gray-400">{message}</div>
 *       <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
 *         <div 
 *           className="bg-green-500 h-full transition-all duration-300"
 *           style={{ width: `${progress}%` }}
 *         />
 *       </div>
 *     </div>
 *   );
 * }
 */

