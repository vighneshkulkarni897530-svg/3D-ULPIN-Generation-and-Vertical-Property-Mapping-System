import React from 'react';
import { Earth3DBackground } from '@/components/common/Earth3DBackground';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen flex flex-col justify-center overflow-x-hidden bg-slate-950">
      {/* 3D Rotating Earth Scene in the Background */}
      <Earth3DBackground speed={0.003} showRings={true} showStars={true} />

      {/* Foreground Form & Auth Content */}
      <div className="relative z-10 w-full py-6 sm:py-10">
        {children}
      </div>
    </div>
  );
}
