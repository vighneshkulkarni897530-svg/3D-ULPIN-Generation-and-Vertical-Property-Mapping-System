import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Command,
  CornerDownLeft,
  MapPin,
  Building2,
  Box,
  Layers,
  X,
  ArrowRight,
  ScanSearch,
  type LucideIcon,
} from "lucide-react";
import { useGIS } from "@/context/GISContext";
import { useProperty } from "@/context/PropertyContext";
import { searchGisRegistry } from "@/lib/gisSearch";
import { GisStatusBadge } from "@/components/common/GisStatusBadge";
import type { PropertyUnit } from "@/types/gis";

/**
 * Global registry search (command-palette style).
 * Seeded from the centralized Phase 1 GIS demo data. Shows categorised
 * results — Land Parcels / Buildings / Properties — each with ID, location
 * and status. Clicking always lands on a *working* destination:
 *   - Parcel   → /map?parcel=…  (map module reacts to the selection)
 *   - Building → /buildings/[id]
 *   - Property → /properties/[legacyId] when the legacy record exists,
 *                otherwise the building's Floor Explorer with the unit
 *                highlighted.
 * Keyboard: Ctrl/⌘+K or "/" to open · Esc to close · Enter to jump when a
 * single result matches.
 */
export function GlobalSearch() {
  const { parcels, buildings, floors, properties } = useGIS();
  const { properties: legacyProperties } = useProperty();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
        return;
      }
      if (e.key === "/" && !open && !isTypingTarget(e.target)) {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape" && open) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery("");
      const t = setTimeout(() => inputRef.current?.focus(), 40);
      return () => clearTimeout(t);
    }
  }, [open]);

  const results = useMemo(
    () => searchGisRegistry(parcels, buildings, floors, properties, query),
    [parcels, buildings, floors, properties, query],
  );

  const close = () => setOpen(false);
  const go = (href: string) => {
    close();
    router.push(href);
  };

  const propertyDestination = (p: PropertyUnit): { href: string; via: string } => {
    const legacy = legacyProperties.find((lp) => lp.id === p.propertyId);
    if (legacy) return { href: `/properties/${legacy.id}`, via: "Property record" };
    return { href: `/buildings/${p.buildingId}/floors?unit=${p.id}`, via: "Floor Explorer" };
  };

  const single = results.total === 1;

  const resolveSingleDestination = (): string | null => {
    if (results.parcels.length === 1) return `/map?parcel=${results.parcels[0].id}`;
    if (results.buildings.length === 1) return `/buildings/${results.buildings[0].id}`;
    if (results.floors.length === 1) return `/buildings/${results.floors[0].buildingId}/floors`;
    if (results.properties.length === 1) return propertyDestination(results.properties[0]).href;
    return null;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && single) {
      const href = resolveSingleDestination();
      if (href) go(href);
    }
  };

  return (
    <>
      {/* ── Trigger ─────────────────────────────────────────────── */}
      <button
        onClick={() => setOpen(true)}
        className="group flex w-full items-center gap-2.5 rounded-xl border border-slate-700/80 bg-slate-900/80 px-3 py-2.5 text-left transition-all hover:border-cyan-500/50 hover:bg-slate-900 md:w-80 md:px-3.5 lg:w-[26rem]"
        aria-label="Search registry"
      >
        <Search className="h-4 w-4 shrink-0 text-cyan-400" />
        <span className="flex-1 truncate text-xs text-slate-400 group-hover:text-slate-300">
          <span className="hidden md:inline">Search registry — property, building, parcel…</span>
          <span className="md:hidden">Search</span>
        </span>
        <span className="hidden items-center gap-1 rounded-md border border-slate-700 bg-slate-950 px-1.5 py-0.5 font-mono text-[9px] font-bold text-slate-500 lg:flex">
          <Command className="h-2.5 w-2.5" /> K
        </span>
      </button>
      {/* ── Modal ───────────────────────────────────────────────── */}
      {open && (
        <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label="Registry search">
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={close} />

          <div className="relative mx-auto mt-14 w-[min(94vw,44rem)] overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-950 shadow-2xl animate-zoom-in">
            {/* Input row */}
            <div className="flex items-center gap-3 border-b border-slate-800 px-4 py-4">
              <Search className="h-4.5 w-4.5 shrink-0 text-cyan-400" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Property ID, demo spatial ID, building, parcel, owner, location…"
                className="min-w-0 flex-1 bg-transparent text-sm font-medium text-white placeholder:text-slate-500 focus:outline-none"
              />
              {query && (
                <button onClick={() => setQuery("")} className="rounded-md p-1 text-slate-500 hover:text-white" aria-label="Clear">
                  <X className="h-4 w-4" />
                </button>
              )}
              <kbd className="hidden shrink-0 rounded-md border border-slate-700 px-1.5 py-0.5 font-mono text-[9px] font-bold text-slate-500 sm:block">
                ESC
              </kbd>
            </div>

            {/* Results */}
            <div className="max-h-[58vh] overflow-y-auto p-2">
              {query.trim().length < 2 ? (
                <div className="flex flex-col items-center gap-3 py-10 text-center">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900 text-slate-500">
                    <ScanSearch className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-300">Search the unified GIS registry</p>
                    <p className="mt-1 max-w-xs text-[11px] leading-relaxed text-slate-500">
                      Matches parcels, buildings and all 20 vertical property units from the Phase 1 demo dataset.
                    </p>
                  </div>
                </div>
              ) : results.total === 0 ? (
                <div className="flex flex-col items-center gap-3 py-10 text-center">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900 text-slate-500">
                    <X className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-300">No registry matches</p>
                    <p className="mt-1 max-w-xs text-[11px] leading-relaxed text-slate-500">
                      Nothing found for “{query}”. Try a property ID such as{" "}
                      <span className="font-mono text-cyan-400">PROP-102-0101</span>, a demo spatial ID{" "}
                      <span className="font-mono text-cyan-400">3D-MH-PUN-…</span>, a building code or a parcel number.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <ResultGroup
                    icon={MapPin}
                    label="Land Parcels"
                    count={results.parcels.length}
                    accent="text-emerald-400"
                    items={results.parcels.map((p) => ({
                      key: p.id,
                      title: p.parcelNumber,
                      mono: p.id,
                      meta: `${p.location}, ${p.district}`,
                      badge: <GisStatusBadge status={p.status} />,
                      onClick: () => go(`/map?parcel=${p.id}`),
                    }))}
                  />
                  <ResultGroup
                    icon={Building2}
                    label="Buildings"
                    count={results.buildings.length}
                    accent="text-cyan-400"
                    items={results.buildings.map((b) => ({
                      key: b.id,
                      title: b.name,
                      mono: b.buildingCode,
                      meta: b.address.split(",").slice(0, 2).join(","),
                      badge: <GisStatusBadge status={b.status} />,
                      onClick: () => go(`/buildings/${b.id}`),
                    }))}
                  />
                  <ResultGroup
                    icon={Box}
                    label="Properties"
                    count={results.properties.length}
                    accent="text-blue-400"
                    items={results.properties.map((p) => {
                      const dest = propertyDestination(p);
                      return {
                        key: p.id,
                        title: p.id,
                        mono: p.demoSpatialId,
                        meta: `${p.ownerReferenceName} · ${p.propertyType} · → ${dest.via}`,
                        badge: <GisStatusBadge status={p.verificationStatus} />,
                        onClick: () => go(dest.href),
                      };
                    })}
                  />

                  <ResultGroup
                    icon={Layers}
                    label="Floors"
                    count={results.floors.length}
                    accent="text-emerald-400"
                    items={results.floors.map((f) => ({
                      key: f.id,
                      title: f.name,
                      mono: `Level ${f.floorNumber} · ${f.buildingId}`,
                      meta: "Building Floor Explorer",
                      onClick: () => go(`/buildings/${f.buildingId}/floors`),
                    }))}
                  />
                </div>
              )}
            {/* Footer hints */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 bg-slate-900/60 px-4 py-2.5 text-[10px] text-slate-500">
                <span className="font-mono">
                  Dataset: 5 parcels · 3 buildings · 15 floors · 20 units
                </span>
                <span className="flex items-center gap-3">
                  <span className="hidden items-center gap-1 sm:flex">
                    <CornerDownLeft className="h-3 w-3" /> Enter {single ? "to open result" : "to jump"}
                  </span>
                  <span className="flex items-center gap-1">
                    <ArrowRight className="h-3 w-3" /> All destinations are live
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || target.isContentEditable;
}

interface ResultGroupProps {
  icon: LucideIcon;
  label: string;
  count: number;
  accent: string;
  items: Array<{
    key: string;
    title: string;
    mono?: string;
    meta: string;
    badge?: React.ReactNode;
    onClick: () => void;
  }>;
}

function ResultGroup({ icon: Icon, label, count, accent, items }: ResultGroupProps) {
  if (items.length === 0) return null;
  return (
    <section>
      <div className="flex items-center gap-2 px-2.5 pb-1.5 pt-1">
        <Icon className={`h-3.5 w-3.5 ${accent}`} />
        <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">{label}</h4>
        <span className="rounded-full bg-slate-800 px-1.5 py-0.5 font-mono text-[9px] font-bold text-slate-400">
          {count}
        </span>
      </div>
      <div className="space-y-1">
        {items.map((item) => (
          <button
            key={item.key}
            onClick={item.onClick}
            className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-slate-900"
          >
            <div className="flex flex-col items-start gap-0.5 overflow-hidden">
              <span className="truncate text-xs font-bold text-slate-100">{item.title}</span>
              {item.mono && <span className="truncate font-mono text-[9px] text-slate-500">{item.mono}</span>}
              <span className="truncate text-[10px] text-slate-400">{item.meta}</span>
            </div>
            <span className="ml-auto shrink-0">{item.badge}</span>
          </button>
        ))}
      </div>
    </section>
  );
}