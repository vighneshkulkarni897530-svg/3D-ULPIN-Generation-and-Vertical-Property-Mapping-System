import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-tight transition-colors",
  {
    variants: {
      variant: {
        default: "border-cyan-300 bg-cyan-50 text-cyan-800",
        navy: "border-slate-700 bg-slate-900 text-cyan-300",
        secondary: "border-slate-200 bg-slate-100 text-slate-700",
        blue: "border-blue-300 bg-blue-50 text-blue-700",
        success: "border-green-300 bg-green-50 text-green-700",
        warning: "border-amber-300 bg-amber-50 text-amber-700",
        destructive: "border-red-300 bg-red-50 text-red-700",
        outline: "border-slate-300 bg-white text-slate-700",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
