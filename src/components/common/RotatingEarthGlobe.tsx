'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface RotatingEarthGlobeProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'hero';
  className?: string;
  showAtmosphere?: boolean;
  showOrbitalRing?: boolean;
  showBadges?: boolean;
  rotationDurationSeconds?: number;
  tiltAngle?: number;
}

const SIZE_MAP = {
  sm: 'w-24 h-24 sm:w-28 sm:h-28',
  md: 'w-36 h-36 sm:w-44 sm:h-44',
  lg: 'w-44 h-44 sm:w-56 sm:h-56 md:w-64 md:h-64',
  xl: 'w-56 h-56 sm:w-72 sm:h-72 md:w-80 md:h-80',
  hero: 'w-64 h-64 sm:w-88 sm:h-88 md:w-[400px] md:h-[400px]',
};

export const RotatingEarthGlobe: React.FC<RotatingEarthGlobeProps> = ({
  size = 'lg',
  className,
  showAtmosphere = true,
  showOrbitalRing = true,
  showBadges = false,
  rotationDurationSeconds = 18,
  tiltAngle = 12,
}) => {
  return (
    <div className={cn('relative flex flex-col items-center justify-center select-none my-2', className)}>
      {/* 3D Perspective Stage */}
      <div
        className="relative flex items-center justify-center"
        style={{ perspective: 1200 }}
      >
        {/* Outer Atmospheric Radiant Glow */}
        {showAtmosphere && (
          <>
            <div className="absolute inset-0 rounded-full bg-sky-500/25 blur-[45px] pointer-events-none scale-140 animate-pulse" />
            <div className="absolute inset-0 rounded-full bg-cyan-400/20 blur-[28px] pointer-events-none scale-120" />
            <div className="absolute inset-0 rounded-full bg-blue-600/20 blur-[60px] pointer-events-none scale-150" />
          </>
        )}

        {/* Orbital Geospatial Rings */}
        {showOrbitalRing && (
          <>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: rotationDurationSeconds * 2, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-[-20%] rounded-full border border-cyan-400/30 border-dashed pointer-events-none scale-110"
            />
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: rotationDurationSeconds * 2.5, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-[-32%] rounded-full border border-sky-500/15 border-dotted pointer-events-none scale-105"
            />
          </>
        )}

        {/* Axial Tilt Container (Earth natural tilt) */}
        <div
          style={{ transform: `rotateZ(-${tiltAngle}deg)` }}
          className="relative flex items-center justify-center"
        >
          {/* Sphere Container with Ambient Shadow & Border Glow */}
          <div
            className={cn(
              'relative rounded-full overflow-hidden shadow-[0_0_50px_rgba(14,165,233,0.5),0_0_100px_rgba(2,132,199,0.3)] border-2 border-sky-400/50 bg-black',
              SIZE_MAP[size]
            )}
            style={{ transformStyle: 'preserve-3d' }}
          >
            {/* 3D Spinning Mesh / Earth Image on Y-Axis */}
            <motion.div
              animate={{ rotateY: [0, 360] }}
              transition={{
                duration: rotationDurationSeconds,
                repeat: Infinity,
                ease: 'linear',
              }}
              style={{
                transformStyle: 'preserve-3d',
                width: '100%',
                height: '100%',
              }}
              className="relative w-full h-full flex items-center justify-center"
            >
              {/* Front Hemisphere Image */}
              <img
                src="/images/earth-globe.jpg"
                alt="3D Rotating Earth Globe"
                className="w-full h-full object-cover rounded-full filter brightness-110 contrast-105"
                style={{
                  backfaceVisibility: 'visible',
                  WebkitBackfaceVisibility: 'visible',
                }}
              />
            </motion.div>

            {/* Static 3D Atmospheric Lighting & Specular Sun Reflection (stays oriented to light source) */}
            <div
              className="absolute inset-0 rounded-full pointer-events-none bg-gradient-to-tr from-black/80 via-transparent to-sky-200/35 mix-blend-screen"
              style={{ zIndex: 10 }}
            />
            <div
              className="absolute inset-0 rounded-full pointer-events-none shadow-[inset_0_0_35px_rgba(0,0,0,0.9),inset_0_0_14px_rgba(56,189,248,0.7)]"
              style={{ zIndex: 11 }}
            />
            <div
              className="absolute top-2 left-4 w-1/3 h-1/3 rounded-full bg-white/20 blur-[10px] pointer-events-none"
              style={{ zIndex: 12 }}
            />
          </div>
        </div>
      </div>

      {/* Geospatial Cadastre Status Badge */}
      {showBadges && (
        <div className="mt-3 flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/80 border border-cyan-500/30 backdrop-blur-md text-[10px] font-mono text-cyan-300">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span>NATIONAL 3D CADASTRE GIS ENGINE · LIVE Y-ROTATION</span>
        </div>
      )}
    </div>
  );
};
