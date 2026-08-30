import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
  homeHref?: string;
}

/**
 * Compact breadcrumb trail — the current page is emphasised, ancestors link
 * back to their sections.
 */
export function Breadcrumbs({ items, className, homeHref = "/" }: BreadcrumbsProps) {
  const crumbs = [{ label: "Home", href: homeHref }, ...items];

  return (
    <nav aria-label="Breadcrumb" className={cn("flex flex-wrap items-center gap-1.5 text-[11px] font-semibold", className)}>
      {crumbs.map((crumb, idx) => {
        const isLast = idx === crumbs.length - 1;
        return (
          <span key={`${crumb.label}-${idx}`} className="inline-flex items-center gap-1.5">
            {idx > 0 && <ChevronRight className="h-3 w-3 text-slate-400" />}
            {isLast || !crumb.href ? (
              <span className={cn("text-slate-500", isLast && "text-slate-900 font-bold")}>
                {idx === 0 ? (
                  <span className="inline-flex items-center gap-1">
                    <Home className="h-3 w-3 text-slate-400" />
                    {crumb.label}
                  </span>
                ) : (
                  crumb.label
                )}
              </span>
            ) : (
              <Link href={crumb.href} className="text-slate-500 transition-colors hover:text-cyan-700">
                {idx === 0 ? (
                  <span className="inline-flex items-center gap-1">
                    <Home className="h-3 w-3 text-slate-400" />
                    {crumb.label}
                  </span>
                ) : (
                  crumb.label
                )}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}