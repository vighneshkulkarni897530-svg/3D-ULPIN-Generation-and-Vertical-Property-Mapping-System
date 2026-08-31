'use client';

/**
 * FullScreenLoader (Phase 10)
 * ---------------------------
 * Branded full-page loading state used while the authentication session is
 * being restored or a guarded redirect is in progress. Prevents protected
 * content from flashing before the guard decision is made.
 */
import React from 'react';
import { Loader2, Landmark } from 'lucide-react';

export const FullScreenLoader: React.FC<{ label?: string }> = ({ label = 'Loading…' }) => (
  <div className="min-h-screen w-full bg-slate-950 flex flex-col items-center justify-center gap-5 text-slate-300">
    <div className="relative">
      <div className="absolute inset-0 rounded-full bg-cyan-500/20 blur-2xl" aria-hidden />
      <div className="relative h-16 w-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-700 flex items-center justify-center shadow-tech-cyan">
        <Landmark className="h-8 w-8 text-slate-950" />
      </div>
    </div>
    <div className="flex items-center gap-2.5 text-xs font-semibold uppercase tracking-widest text-slate-400">
      <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-400" />
      <span>{label}</span>
    </div>
  </div>
);

export default FullScreenLoader;
