"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { Layers } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
import { GisFloorExplorer } from "@/components/gis/GisFloorExplorer";
import { useGIS } from "@/context/GISContext";

export default function BuildingFloorsPage() {
  const params = useParams<{ id: string }>();
  const buildingId = params?.id ?? "";
  const { buildings } = useGIS();
  const [highlightUnitId, setHighlightUnitId] = React.useState<string | null>(null);

  const building = buildings.find((b) => b.id === buildingId);

  // Honour deep-links `?unit=PROP-…` (global search, building detail).
  React.useEffect(() => {
    const unit = new URLSearchParams(window.location.search).get("unit");
    setHighlightUnitId(unit);
  }, []);

  return (
    <PageContainer>
      <div className="space-y-6">
        <Breadcrumbs
          items={[
            { label: "Buildings", href: "/buildings" },
            { label: building?.name ?? buildingId, href: `/buildings/${buildingId}` },
            { label: "Floor Explorer" },
          ]}
        />
        <PageHeader
          eyebrow="FLOOR EXPLORER · DRILL-DOWN"
          title={building ? `${building.name} — Floors & Units` : "Floor Explorer"}
          description={
            building
              ? `Navigate the ${building.totalFloors} registered floors and their vertical property units. Highlighted units arrive from deep links across the platform.`
              : "Navigate floors and vertical property units for this building."
          }
          actions={
            <span className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 font-mono text-[10px] font-bold text-slate-500">
              <Layers className="h-3.5 w-3.5 text-cyan-600" /> {buildingId}
            </span>
          }
        />
        <GisFloorExplorer buildingId={buildingId} highlightUnitId={highlightUnitId ?? undefined} />
      </div>
    </PageContainer>
  );
}