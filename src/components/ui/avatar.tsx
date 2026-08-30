import * as React from "react";
import { cn } from "@/lib/utils";

interface AvatarProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallback?: string;
}

/** Lightweight avatar with initial-letter fallback. */
const Avatar = React.forwardRef<HTMLImageElement, AvatarProps>(
  ({ className, src, alt = "", fallback = "?", ...props }, ref) => {
    const [errored, setErrored] = React.useState(false);
    const showFallback = !src || errored;

    if (showFallback) {
      return (
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 text-[11px] font-black text-slate-950 ring-2 ring-cyan-500/40",
            className
          )}
        >
          {fallback.slice(0, 2).toUpperCase()}
        </span>
      );
    }

    return (
      <img
        ref={ref}
        src={src}
        alt={alt}
        onError={() => setErrored(true)}
        className={cn("h-9 w-9 shrink-0 rounded-full object-cover ring-2 ring-cyan-500/40", className)}
        {...props}
      />
    );
  }
);
Avatar.displayName = "Avatar";

export { Avatar };
