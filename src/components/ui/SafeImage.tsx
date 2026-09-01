'use client';

import * as React from "react";
import { cn } from "@/lib/utils";

export interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  /** Local fallback asset shown when the source fails to load. */
  fallbackSrc?: string;
}

export const SafeImage = React.forwardRef<HTMLImageElement, SafeImageProps>(
  ({ fallbackSrc = "/images/property-fallback.svg", className, onError, loading = "lazy", ...props }, ref) => {
    const [failed, setFailed] = React.useState(false);
    React.useEffect(() => { setFailed(false); }, [props.src]);
    const handleError = React.useCallback(
      (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
        onError?.(event);
        setFailed(true);
      },
      [onError],
    );
    const src = failed || !props.src ? fallbackSrc : props.src;
    return (
      <img
        {...props}
        ref={ref}
        src={src}
        onError={handleError}
        className={cn(className)}
        loading={loading}
      />
    );
  },
);
SafeImage.displayName = "SafeImage";