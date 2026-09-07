'use client';

import React, { useRef, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface Earth3DBackgroundProps {
  className?: string;
  videoSrc?: string;
}

export const Earth3DBackground: React.FC<Earth3DBackgroundProps> = ({
  className,
  videoSrc = '/videos/earth-3d-loop.mp4',
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isVideoReady, setIsVideoReady] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Ensure video is playing and continuously looping
    const handlePlay = async () => {
      try {
        video.muted = true;
        await video.play();
        setIsVideoReady(true);
      } catch (err) {
        console.warn('Autoplay prevented or waiting for interaction:', err);
      }
    };

    handlePlay();

    // Fallback listener in case loop attribute has a micro-gap on some browsers
    const handleEnded = () => {
      video.currentTime = 0;
      video.play().catch(() => {});
    };

    video.addEventListener('ended', handleEnded);
    return () => {
      video.removeEventListener('ended', handleEnded);
    };
  }, [videoSrc]);

  return (
    <div
      aria-hidden="true"
      className={cn(
        'fixed inset-0 pointer-events-none z-0 overflow-hidden select-none bg-slate-950',
        className
      )}
    >
      {/* Seamless Continuous 3D Earth Video Loop */}
      <div className="absolute inset-0 w-full h-full overflow-hidden flex items-center justify-center">
        <video
          ref={videoRef}
          src={videoSrc}
          autoPlay
          loop
          muted
          playsInline
          controls={false}
          disablePictureInPicture
          disableRemotePlayback
          preload="auto"
          onLoadedData={() => setIsVideoReady(true)}
          onCanPlay={() => {
            setIsVideoReady(true);
            videoRef.current?.play().catch(() => {});
          }}
          className={cn(
            'pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[105vw] h-[105vh] min-w-[100vw] min-h-[100vh] object-cover select-none scale-105 transition-opacity duration-700 ease-out',
            isVideoReady ? 'opacity-95' : 'opacity-0'
          )}
          style={{
            filter: 'contrast(108%) brightness(95%) saturate(110%)',
          }}
        />
      </div>

      {/* Atmospheric Ambient Lighting and Cosmic Scrim */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-slate-950/60 pointer-events-none" />
      <div className="absolute inset-0 bg-slate-950/20 pointer-events-none" />

      {/* Radial Blue & Cyan Space Glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-sky-500/10 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 left-1/4 w-[500px] h-[300px] bg-blue-700/10 blur-[130px] rounded-full pointer-events-none" />
    </div>
  );
};
