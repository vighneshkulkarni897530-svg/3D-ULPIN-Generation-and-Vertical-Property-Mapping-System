'use client';

/**
 * Global Error Boundary (Next.js App Router)
 * ===========================================
 * Catches errors in the root layout and provides a safe fallback recovery UI.
 */
import * as React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error('Uncaught Global Error:', error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-6 text-slate-100 font-sans antialiased">
        <div className="mx-auto max-w-md space-y-6 rounded-3xl border border-slate-800 bg-slate-900/90 p-8 text-center shadow-2xl backdrop-blur-xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-400">
            <AlertTriangle className="h-8 w-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-black text-white">Critical System Error</h1>
            <p className="text-xs text-slate-400 leading-relaxed">
              A root-level exception occurred in the 3D ULPIN GIS application shell. Your data records remain secure.
            </p>
          </div>

          {error?.digest && (
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-2.5 font-mono text-[10px] text-slate-500">
              Digest: {error.digest}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => reset()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-500 px-4 py-2 text-xs font-black text-slate-950 transition-colors hover:bg-cyan-400"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Recover Application
            </button>
            <a
              href="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-bold text-slate-200 transition-colors hover:bg-slate-700"
            >
              <Home className="h-3.5 w-3.5" /> Home Dashboard
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
