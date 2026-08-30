import * as React from "react";
import { cn } from "@/lib/utils";

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Standard content container used across the application shell.
 * Provides the shared max-width, gutters and vertical rhythm. The bottom
 * padding keeps content clear of the fixed mobile bottom-tab navigation.
 */
export function PageContainer({ children, className }: PageContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-7xl px-4 pt-6 pb-24 sm:px-6 lg:px-8 lg:pt-8 lg:pb-14",
        className,
      )}
    >
      {children}
    </div>
  );
}