"use client";

import * as React from "react";
import { Building2, MapPin } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { GisFloorExplorer } from "@/components/gis/GisFloorExplorer";
import { GisStatusBadge } from "@/components/common/GisStatusBadge";
import { useGIS } from "@/context/GISContext";
import { cn } from "@/lib/utils";

export default function FloorsExplorerPage() {
  const { buildings, floors, properties } = useGIS();
  const [buildingId, setBuildingId] = React.useState<string | null>(null);
  const [highlightUnitId, setHighlightUnitId] = React.useState<string | null>(null);

  React.useEffect(() => {
    const unit = new URLSearchParams(window.location.search).get("unit");
    setHighlightUnitId(unit);
  }, []);

  const activeBuildingId = buildingId ?? buildings[0]?.id ?? null;
  const activeBuilding = buildings.find((b) => b.id === activeBuildingId) ?? null;

  return (
    <PageContainer>
      <div className="space-y-6">
        <Breadcrumbs items={[{ label: "Floor Explorer" }]} />
        <PageHeader
          eyebrow="FLOOR EXPLORER"
          title="Vertical Floor & Unit Exploration"
          description={`${buildings.length} buildings · ${floors.length} floors · ${properties.length} vertical property units. Pick a building, then drill into any floor.`}
        />

        {/* Building selector */}
        <div className="flex flex-wrap gap-2">
          {buildings.map((building) => {
            const selected = building.id === activeBuildingId;
            const unitCount = properties.filter((p) => p.buildingId === building.id).length;
            const floorCount = floors.filter((f) => f.buildingId === building.id).length;
            return (
              <button
                key={building.id}
                onClick={() => setBuildingId(building.id)}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-left transition-all",
                  selected
                    ? "border-cyan-400 bg-gradient-to-r from-cyan-500/15 to-blue-600/10 shadow-sm"
                    : "border-slate-200 bg-white hover:border-cyan-300",
                )}
              >
                <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", selected ? "bg-cyan-500/20 text-cyan-700" : "bg-slate-100 text-slate-500")}>
                  <Building2 className="h-4 w-4" />
                </span>
                <span>
                  <span className="block text-xs font-extrabold text-slate-900">{building.name}</span>
                  <span className="flex items-center gap-1.5 font-mono text-[9px] text-slate-500">
                    {building.id} · {floorCount} floors · {unitCount} units
                  </span>
                </span>
                <GisStatusBadge status={building.status} />
              </button>
            );
          })}
        </div>

        {activeBuilding ? (
          <GisFloorExplorer buildingId={activeBuilding.id} highlightUnitId={highlightUnitId ?? undefined} />
        ) : (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-white/60 py-16 text-center text-xs text-slate-400">
            No buildings in the registry to explore.
          </p>
        )}

        <p className="flex items-center justify-center gap-1.5 font-mono text-[9px] uppercase tracking-widest text-slate-400">
          <MapPin className="h-3 w-3" /> Floor Explorer is a live Phase 2 module backed by the unified GIS registry
        </p>
      </div>
    </PageContainer>
  );
}