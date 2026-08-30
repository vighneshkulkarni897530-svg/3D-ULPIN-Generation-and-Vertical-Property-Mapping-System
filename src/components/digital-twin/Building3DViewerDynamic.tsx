"use client";

import dynamic from "next/dynamic";
import type { Building3DViewerHandle, ViewerTool } from "./Building3DViewer";
import type { TwinFloor } from "@/data/mockDigitalTwin";

export type { Building3DViewerHandle, ViewerTool };

export interface Building3DViewerDynamicProps {
  floors: TwinFloor[];
  selectedFloorLevel: number;
  onSelectFloor: (level: number) => void;
  tool: ViewerTool;
  className?: string;
}

/**
 * The holographic 3D viewer is heavy (Three.js). Load it client-side only
 * so the rest of the page SSR-prints instantly.
 */
export const Building3DViewerDynamic = dynamic(
  () => import("./Building3DViewer").then((m) => m.Building3DViewer),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-[#020B18]">
        <div className="flex flex-col items-center gap-3">
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00D9FF] opacity-60" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-[#00D9FF]" />
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#94A3B8]">
            Initializing 3D twin...
          </span>
        </div>
      </div>
    ),
  }
);