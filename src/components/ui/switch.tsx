"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface SwitchProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
}

const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ checked, defaultChecked, onCheckedChange, disabled, className, id }, ref) => {
    const [internal, setInternal] = React.useState(defaultChecked ?? false);
    const isControlled = checked !== undefined;
    const current = isControlled ? checked : internal;

    const toggle = () => {
      if (disabled) return;
      const next = !current;
      if (!isControlled) setInternal(next);
      onCheckedChange?.(next);
    };

    return (
      <button
        type="button"
        role="switch"
        id={id}
        aria-checked={current}
        ref={ref}
        disabled={disabled}
        onClick={toggle}
        className={cn(
          "inline-flex h-5.5 w-10 shrink-0 items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40 disabled:cursor-not-allowed disabled:opacity-50",
          current ? "border-cyan-500 bg-cyan-500" : "border-slate-300 bg-slate-200",
          className
        )}
      >
        <span
          className={cn(
            "block h-4 w-4 rounded-full bg-white shadow transition-transform",
            current ? "translate-x-5" : "translate-x-0.5"
          )}
        />
      </button>
    );
  }
);
Switch.displayName = "Switch";

export { Switch };
