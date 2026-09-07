'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Globe2 } from 'lucide-react';

interface RotatingEarthGlobeProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'hero';
  className?: string;
  showAtmosphere?: boolean;
  showOrbitalRing?: boolean;
  rotationDurationSeconds?: number;
}

const SIZE_CLASSES = {
  xs: 'w-12 h-12',
  sm: 'w-16 h-16',
  md: 'w-24 h-24',
  lg: 'w-36 h-36',
  xl: 'w-48 h-48 sm:w-60 sm:h-60',
  hero: 'w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96',
};

export const RotatingEarthGlobe: React.FC<RotatingEarthGlobeProps> = ({
  size = 'md',
  className,
  showAtmosphere = true,
  showOrbitalRing = true,
  rotationDurationSeconds = 45,
}) => {
  return (
    <div className={cn('relative flex items-center justify-center select-none', className)}>
      {/* Outer Atmospheric Blue Glow */}
      {showAtmosphere && (
        <>
          <div className="absolute inset-0 rounded-full bg-sky-500/20 blur-[32px] pointer-events-none scale-125" />
          <div className="absolute inset-0 rounded-full bg-cyan-400/15 blur-[18px] pointer-events-none scale-110" />
        </>
      )}

      {/* Orbital Geospatial Ring */}
      {showOrbitalRing && (
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: rotationDurationSeconds * 1.5, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-[-18%] rounded-full border border-cyan-500/30 border-dashed pointer-events-none scale-105"
        />
      )}

      {/* Sphere Container with Atmospheric Rim Light */}
      <div
        className={cn(
          'relative rounded-full overflow-hidden shadow-[0_0_40px_rgba(56,189,248,0.45)] border border-sky-400/40 bg-black',
          SIZE_CLASSES[size]
        )}
      >
        {/* Continuous Rotating Earth Texture */}
        <motion.img
          src="/images/earth-globe.jpg"
          alt="Rotating Earth Globe"
          animate={{ rotate: 360 }}
          transition={{
            duration: rotationDurationSeconds,
            repeat: Infinity,
            ease: 'linear',
          }}
          className="w-full h-full object-cover rounded-full filter brightness-105 contrast-110"
        />

        {/* Sphere 3D Spherical Shadow & Specular Highlight Overlay */}
        <div className="absolute inset-0 rounded-full pointer-events-none bg-gradient-to-tr from-black/60 via-transparent to-sky-300/25 mix-blend-screen" />
        <div className="absolute inset-0 rounded-full pointer-events-none shadow-[inset_0_0_24px_rgba(0,0,0,0.85),inset_0_0_8px_rgba(56,189,248,0.6)]" />
      </div>
    </div>
  );
};
