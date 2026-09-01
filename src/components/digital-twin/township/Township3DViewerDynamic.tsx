"use client";

import dynamic from "next/dynamic";
import type { Township3DViewerHandle, Township3DViewerProps } from "./Township3DViewer";

export type { Township3DViewerHandle, Township3DViewerProps };

/**
 * The township 3D viewer is heavy (Three.js). Load it client-side only so
 * the rest of the page SSR-prints instantly (same pattern as the original
 * Building3DViewerDynamic wrapper).
 */
export const Township3DViewerDynamic = dynamic(
  () => import("./Township3DViewer").then((m) => m.Township3DViewer),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-gradient-to-b from-[#20364a] to-[#16283a]">
        <div className="flex flex-col items-center gap-3">
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00D9FF] opacity-60" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-[#00D9FF]" />
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#94A3B8]">
            Initializing 3D township...
          </span>
        </div>
      </div>
    ),
  }
);
