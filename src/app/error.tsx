'use client';

/**
 * Root Error Boundary (Phase 12)
 * ==============================
 * Gracefully captures uncaught runtime errors across the application.
 * Prevents UI crashes and internal stack trace leakage.
 */

import * as React from 'react';
import Link from 'next/link';
import { AlertTriangle, Home, RefreshCw, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function RootErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    // Log sanitized error report
    console.error('Uncaught Application Error:', error.message || error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center p-6 text-center">
      <div className="mx-auto max-w-md space-y-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-md">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 border border-rose-100">
          <ShieldAlert className="h-8 w-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-extrabold text-slate-900">
            System Notice: Unable to Complete Request
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            An unexpected error occurred while loading this cadastral module. Your session and records remain secure.
          </p>
        </div>

        {error.digest && (
          <div className="rounded-lg bg-slate-50 p-2.5 font-mono text-[10px] text-slate-400 border border-slate-200">
            Ref Code: {error.digest}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Button
            onClick={() => reset()}
            className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs"
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Try Again
          </Button>
          <Button asChild variant="outline" className="text-xs font-bold border-slate-300">
            <Link href="/dashboard">
              <Home className="mr-1.5 h-3.5 w-3.5" /> Return to Dashboard
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
