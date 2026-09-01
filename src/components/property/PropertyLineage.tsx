"use client";

import * as React from "react";
import Link from "next/link";
import { Building2, Landmark, Layers, Fingerprint, ChevronDown, MousePointerClick } from "lucide-react";
import { useGIS } from "@/context/GISContext";
import { cn } from "@/lib/utils";
import type { PropertyUnit } from "@/types/gis";

interface PropertyLineageProps {
  unit: PropertyUnit;
  className?: string;
}

/**
 * Clickable vertical lineage — LAND PARCEL → BUILDING → FLOOR → PROPERTY.
 * Every ancestor chip is a real navigation link:
 *   Parcel  → /map?parcel=…            (GIS map selection)
 *   Building→ /buildings/[id]          (building workspace)
 *   Floor   → /buildings/[id]/floors?unit=… (floor explorer, unit highlighted)
 * The property itself is the current page (active chip, not a link).
 */
export function PropertyLineage({ unit, className }: PropertyLineageProps) {
  const { parcels, buildings, floors } = useGIS();

  const parcel = parcels.find((p) => p.id === unit.parcelId);
  const building = buildings.find((b) => b.id === unit.buildingId);
  const floor = floors.find((f) => f.id === unit.floorId);

  const levels: Array<{
    key: string;
    icon: React.ComponentType<{ className?: string }>;
    eyebrow: string;
    label: string;
    sub: string;
    href?: string;
    active?: boolean;
  }> = [
    {
      key: "parcel",
      icon: Landmark,
      eyebrow: "Land Parcel",
      label: parcel?.parcelNumber ?? unit.parcelId,
      sub: parcel?.location ?? unit.parcelId,
      href: `/map?parcel=${unit.parcelId}`,
    },
    {
      key: "building",
      icon: Building2,
      eyebrow: "Building",
      label: building?.name ?? unit.buildingId,
      sub: building?.buildingCode ?? unit.buildingId,
      href: `/buildings/${unit.buildingId}`,
    },
    {
      key: "floor",
      icon: Layers,
      eyebrow: "Floor",
      label: floor ? floor.name : unit.floorId,
      sub: floor ? `Level ${floor.floorNumber} · elev ${floor.elevation.toFixed(1)} m` : unit.floorId,
      href: `/buildings/${unit.buildingId}/floors?unit=${unit.id}`,
    },
    {
      key: "property",
      icon: Fingerprint,
      eyebrow: "Property Unit",
      label: unit.id,
      sub: unit.demoSpatialId,
      active: true,
    },
  ];

  return (
    <div className={cn("rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5", className)}>
      <p className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
        <MousePointerClick className="h-3.5 w-3.5 text-cyan-600" /> Property Lineage — click any ancestor to navigate
      </p>

      <div className="mt-3 space-y-1">
        {levels.map((level, i) => {
          const Icon = level.icon;
          const inner = (
            <span className="flex items-center gap-3">
              <span
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border",
                  level.active ? "border-cyan-300 bg-cyan-50 text-cyan-700" : "border-slate-200 bg-slate-50 text-slate-500",
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1 text-left">
                <span className="block text-[8.5px] font-extrabold uppercase tracking-widest text-slate-400">{level.eyebrow}</span>
                <span
                  className={cn(
                    "block truncate text-[12px] font-extrabold tracking-tight",
                    level.active ? "text-cyan-700" : "text-slate-900",
                  )}
                >
                  {level.label}
                </span>
                <span className="block truncate font-mono text-[9px] text-slate-400">{level.sub}</span>
              </span>
              {level.href && (
                <ChevronDown className="h-4 w-4 shrink-0 rotate-[-90deg] text-slate-300" aria-hidden />
              )}
              {level.active && (
                <span className="shrink-0 rounded-full bg-cyan-100 px-2 py-0.5 text-[8.5px] font-extrabold uppercase tracking-widest text-cyan-700">
                  Current
                </span>
              )}
            </span>
          );

          const row = (
            <span
              className={cn(
                "block rounded-xl border px-3 py-2.5 transition-colors",
                level.active
                  ? "border-cyan-300 bg-cyan-50/60"
                  : "border-slate-200 bg-white hover:border-cyan-300 hover:bg-cyan-50/30",
              )}
            >
              {inner}
            </span>
          );

          return (
            <React.Fragment key={level.key}>
              {level.href ? (
                <Link href={level.href} className="block" title={`Open ${level.eyebrow}`}>
                  {row}
                </Link>
              ) : (
                row
              )}
              {i < levels.length - 1 && (
                <div className="flex justify-start pl-8" aria-hidden>
                  <span className="h-3 w-px bg-slate-300" />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[9.5px] leading-relaxed text-amber-800">
        <strong className="font-extrabold">Demo Spatial Identifier</strong> — {unit.demoSpatialId} is platform-generated for
        this demo environment and is not an independently generated legally valid government ULPIN.
      </p>
    </div>
  );
}