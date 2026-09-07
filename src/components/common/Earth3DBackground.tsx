'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface Earth3DBackgroundProps {
  className?: string;
  videoId?: string;
  showFallbackShader?: boolean;
}

export const Earth3DBackground: React.FC<Earth3DBackgroundProps> = ({
  className,
  videoId = 'h_LQlnZBXpQ', // 4K 3D Earth Globe Spinning (Night & Day)
  showFallbackShader = true,
}) => {
  const [mounted, setMounted] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="fixed inset-0 pointer-events-none z-0 bg-slate-950 overflow-hidden" />
    );
  }

  return (
    <div
      aria-hidden="true"
      className={cn(
        'fixed inset-0 pointer-events-none z-0 overflow-hidden select-none bg-slate-950',
        className
      )}
    >
      {/* 4K 3D Earth Globe Spinning Video (Night & Day) from YouTube */}
      <div className="absolute inset-0 w-full h-full overflow-hidden flex items-center justify-center">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&showinfo=0&autohide=1&modestbranding=1&iv_load_policy=3&rel=0&disablekb=1&playsinline=1&enablejsapi=1`}
          title="4K 3D Earth Globe Spinning (Night & Day)"
          allow="autoplay; encrypted-media"
          onLoad={() => setVideoLoaded(true)}
          className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[160vw] h-[160vh] min-w-[1200px] min-h-[800px] max-w-none border-0 select-none object-cover opacity-90 transition-opacity duration-1000 scale-105"
          style={{
            filter: 'contrast(108%) brightness(95%) saturate(110%)',
          }}
        />
      </div>

      {/* Atmospheric Ambient Lighting and Cosmic Scrim */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-slate-950/60 pointer-events-none" />
      <div className="absolute inset-0 bg-radial-vignette opacity-50 pointer-events-none" />

      {/* Radial Blue & Cyan Space Glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-sky-500/10 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 left-1/4 w-[500px] h-[300px] bg-blue-700/10 blur-[130px] rounded-full pointer-events-none" />
    </div>
  );
};
