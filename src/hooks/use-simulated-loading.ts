"use client";

import * as React from "react";

/**
 * Simulates async operations (auth, submissions, status updates) on the
 * frontend-only platform. Returns a `run` helper that flips `isLoading`
 * around a mocked latency window, and an opaque "processing stage" for
 * progress indicators.
 */
export function useSimulatedLoading(defaultDelayMs = 900) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [stage, setStage] = React.useState<string | null>(null);
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const run = React.useCallback(
    (task: () => void, options?: { delayMs?: number; stages?: string[] }) => {
      setIsLoading(true);
      const stages = options?.stages;
      if (stages && stages.length) {
        let i = 0;
        setStage(stages[0]);
        const interval = setInterval(() => {
          i += 1;
          if (i < stages.length) setStage(stages[i]);
          else clearInterval(interval);
        }, (options?.delayMs ?? defaultDelayMs) / stages.length);
        timeoutRef.current = setTimeout(() => {
          clearInterval(interval);
          setStage(null);
          setIsLoading(false);
          task();
        }, options?.delayMs ?? defaultDelayMs);
      } else {
        timeoutRef.current = setTimeout(() => {
          setIsLoading(false);
          task();
        }, options?.delayMs ?? defaultDelayMs);
      }
    },
    [defaultDelayMs]
  );

  return { isLoading, stage, run };
}
