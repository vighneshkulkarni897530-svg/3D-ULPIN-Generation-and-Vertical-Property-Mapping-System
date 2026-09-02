'use client';

/**
 * /resident/property — My Property Portal (Phase 10)
 * ==================================================
 * Shows the resident's linked property by resolving live Phase 1/2 records
 * (societies → buildings → floors → flats) and Phase 4/5 cadastral data.
 * Fully integrates 2D GIS deep-links, 3D Digital Twin inspection,
 * Government Verification status, and official Cadastral Report generation.
 */

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  Box,
  Building2,
  Download,
  ExternalLink,
  FileText,
  Grid3X3,
  Home,
  Info,
  Layers,
  Loader2,
  MapPin,
  RefreshCcw,
  ScanLine,
  ShieldCheck,
} from 'lucide-react';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { PageHeader, SectionHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { useAuth } from '@/context/AuthContext';
import {
  resolveResidentProperty,
  type ResolvedResidentProperty,
} from '@/lib/society/residentProperty';
import { getMyResidentRecord } from '@/lib/society/residentService';
import { getVerification } from '@/lib/society/governmentService';
import { generatePropertyReport, type PropertyReportData } from '@/lib/reports/reportService';
import { ReportModal } from '@/components/reports/ReportModal';
import {
  FLAT_STATUS_LABELS,
  FLAT_STATUS_VARIANTS,
  FLOOR_TYPE_LABELS,
  OCCUPANCY_TYPE_LABELS,
  RESIDENT_STATUS_LABELS,
  RESIDENT_STATUS_VARIANTS,
  UNIT_TYPE_LABELS,
  type Resident,
  type GovVerification,
} from '@/types/society';
import {
  generateSocietyUlpin,
  generate3DVerticalSubUlpin,
} from '@/lib/society/ulpinGenerator';

type LoadState = 'loading' | 'ready' | 'error';

function formatDate(date: Date | null): string {
  if (!date) return '—';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 py-2 last:border-b-0">
      <dt className="shrink-0 text-[11px] font-semibold text-slate-400">{label}</dt>
      <dd className="break-words text-right text-xs font-semibold text-slate-800">{value ?? '—'}</dd>
    </div>
  );
}

export default function ResidentPropertyPage() {
  return (
    <ProtectedRoute>
      <ResidentPropertyContent />
    </ProtectedRoute>
  );
}

function ResidentPropertyContent() {
  const router = useRouter();
  const { sessionUser, authStatus } = useAuth();
  const [record, setRecord] = React.useState<Resident | null>(null);
  const [property, setProperty] = React.useState<ResolvedResidentProperty | null>(null);
  const [verification, setVerification] = React.useState<GovVerification | null>(null);
  const [state, setState] = React.useState<LoadState>('loading');
  const [reloadKey, setReloadKey] = React.useState(0);

  // Report Modal
  const [reportModalOpen, setReportModalOpen] = React.useState(false);
  const [reportData, setReportData] = React.useState<PropertyReportData | null>(null);
  const [generatingReport, setGeneratingReport] = React.useState(false);

  React.useEffect(() => {
    if (authStatus !== 'initializing' && !sessionUser?.id) {
      router.replace('/auth/login?next=/resident/property');
    }
  }, [authStatus, sessionUser, router]);

  React.useEffect(() => {
    if (authStatus !== 'authenticated') return;
    let cancelled = false;
    setState('loading');
    (async () => {
      try {
        const rec = await getMyResidentRecord();
        if (cancelled) return;
        setRecord(rec);
        if (rec) {
          const [prop, ver] = await Promise.all([
            resolveResidentProperty(rec),
            getVerification('flat', rec.flatId).catch(() => null),
          ]);
          if (cancelled) return;
          setProperty(prop);
          setVerification(ver);
        } else {
          setProperty(null);
          setVerification(null);
        }
        if (!cancelled) setState('ready');
      } catch {
        if (!cancelled) setState('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authStatus, reloadKey]);

  const handleGenerateReport = async () => {
    if (!record) return;
    try {
      setGeneratingReport(true);
      const rep = await generatePropertyReport(
        record.societyId,
        record.buildingId,
        record.floorId,
        record.flatId,
      );
      if (rep) {
        setReportData(rep);
        setReportModalOpen(true);
      }
    } catch (err) {
      console.error('Failed to generate report:', err);
    } finally {
      setGeneratingReport(false);
    }
  };

  const flat = property?.flat ?? null;
  const baseUlpin = property?.society ? generateSocietyUlpin(property.society) : null;
  const verticalUlpin =
    baseUlpin && property?.floor && flat
      ? generate3DVerticalSubUlpin(baseUlpin, property.floor.floorNumber, flat.flatNumber)
      : null;

  const elevationMeters = property?.floor ? property.floor.floorNumber * 3.2 : 3.2;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      <PageHeader
        eyebrow="CADASTRE &amp; 3D DIGITAL TWIN · PHASE 10"
        title="My Property"
        description="Your registered vertical flat unit, resolved live from official society cadastral records."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {property?.society && property?.building && flat && (
              <>
                <Button variant="outline" size="sm" asChild>
                  <Link
                    href={`/map?society=${property.society.id}&building=${property.building.id}&flat=${flat.id}`}
                  >
                    <Layers className="h-3.5 w-3.5 mr-1 text-cyan-600" /> 2D GIS Map
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link
                    href={`/map?society=${property.society.id}&flat=${flat.id}&mode=3d`}
                  >
                    <Box className="h-3.5 w-3.5 mr-1 text-purple-600" /> 3D Twin
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateReport}
                  disabled={generatingReport}
                  className="font-bold border-slate-300"
                >
                  <FileText className="h-3.5 w-3.5 mr-1 text-amber-600" />
                  {generatingReport ? 'Generating...' : 'Cadastral Report'}
                </Button>
              </>
            )}
            {record ? (
              <Badge
                variant={RESIDENT_STATUS_VARIANTS[record.status]}
                className="px-3 py-1 text-xs"
              >
                {RESIDENT_STATUS_LABELS[record.status]}
              </Badge>
            ) : undefined}
          </div>
        }
      />

      {state === 'loading' && (
        <div className="flex min-h-[40vh] items-center justify-center">
          <p className="flex items-center gap-2 text-xs font-semibold text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading your property…
          </p>
        </div>
      )}

      {state === 'error' && (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="mx-auto w-fit rounded-2xl border border-red-200 bg-red-50 p-3">
              <AlertTriangle className="h-8 w-8 text-red-500" aria-hidden="true" />
            </div>
            <h2 className="mt-4 text-base font-bold text-slate-900">Could not load your property</h2>
            <p className="mt-1 text-xs text-slate-500">Please check your connection and try again.</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => setReloadKey((k) => k + 1)}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {state === 'ready' && !record && (
        <Card>
          <CardContent className="p-6">
            <EmptyState
              icon={<Home className="h-8 w-8" aria-hidden="true" />}
              title="No registered property"
              description="Register as a resident to link your flat and view your property details."
              action={
                <Button variant="gradient" asChild>
                  <Link href="/resident/register">Register as Resident</Link>
                </Button>
              }
            />
          </CardContent>
        </Card>
      )}

      {state === 'ready' && record && (
        <div className="space-y-6">
          {record.status === 'pending' && (
            <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">
              Pending Society Admin Approval — the flat below is the one selected in your
              registration.
            </p>
          )}
          {record.status === 'rejected' && (
            <p role="status" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">
              Registration Rejected — this was the flat referenced by your rejected application.
            </p>
          )}

          {/* Verification Status Banner */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-50 p-2 border border-emerald-200">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">Cadastral Verification Status</p>
                <p className="text-[11px] text-slate-500">
                  {verification?.status ? `Current status: ${verification.status.toUpperCase()}` : 'In queue for government review'}
                </p>
              </div>
            </div>
            <Badge variant={verification?.status === 'verified' ? 'default' : 'secondary'} className="text-xs">
              {verification?.status ? verification.status.toUpperCase() : 'PENDING'}
            </Badge>
          </div>

          <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-700">
            Society Structure · Official Records
          </p>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Card className="border border-slate-200 bg-white">
              <CardContent className="p-5">
                <SectionHeader icon={<Home className="h-4 w-4 text-cyan-600" aria-hidden="true" />} title="Society" />
                <dl className="mt-3">
                  <DetailRow label="Name" value={property?.society?.name} />
                  <DetailRow label="Type" value={property?.society?.type} />
                  <DetailRow
                    label="Cadastral Base ULPIN"
                    value={
                      baseUlpin ? (
                        <span className="font-mono text-cyan-800 font-bold">{baseUlpin}</span>
                      ) : (
                        '—'
                      )
                    }
                  />
                  <DetailRow
                    label="Address"
                    value={
                      property?.society
                        ? `${property.society.address.city}, ${property.society.address.state} — ${property.society.address.pinCode}`
                        : null
                    }
                  />
                </dl>
              </CardContent>
            </Card>

            <Card className="border border-slate-200 bg-white">
              <CardContent className="p-5">
                <SectionHeader icon={<Building2 className="h-4 w-4 text-cyan-600" aria-hidden="true" />} title="Building" />
                <dl className="mt-3">
                  <DetailRow label="Name" value={property?.building?.name} />
                  <DetailRow label="Code" value={property?.building?.code} />
                  <DetailRow label="Type" value={property?.building?.type} />
                  <DetailRow label="Floors" value={property?.building?.floorCount} />
                  <DetailRow
                    label="Lift Available"
                    value={
                      property?.building
                        ? property.building.liftAvailable
                          ? `Yes (${property.building.liftCount || 1})`
                          : 'No'
                        : null
                    }
                  />
                  <DetailRow
                    label="Parking Capacity"
                    value={
                      property?.building
                        ? property.building.parkingAvailable
                          ? `Yes (${property.building.parkingCapacity || 0} spaces)`
                          : 'No'
                        : null
                    }
                  />
                </dl>
              </CardContent>
            </Card>

            <Card className="border border-slate-200 bg-white">
              <CardContent className="p-5">
                <SectionHeader icon={<Layers className="h-4 w-4 text-cyan-600" aria-hidden="true" />} title="Floor" />
                <dl className="mt-3">
                  <DetailRow label="Label" value={property?.floor?.floorLabel} />
                  <DetailRow label="Floor Number" value={property?.floor?.floorNumber} />
                  <DetailRow
                    label="Type"
                    value={
                      property?.floor
                        ? (FLOOR_TYPE_LABELS[property.floor.floorType] ?? property.floor.floorType)
                        : null
                    }
                  />
                  <DetailRow label="Elevation (Z)" value={`~${elevationMeters} meters`} />
                </dl>
              </CardContent>
            </Card>

            <Card className="border border-slate-200 bg-white">
              <CardContent className="p-5">
                <SectionHeader icon={<Grid3X3 className="h-4 w-4 text-cyan-600" aria-hidden="true" />} title="Flat Unit" />
                <dl className="mt-3">
                  <DetailRow label="Flat Number" value={flat?.flatNumber} />
                  <DetailRow
                    label="3D Vertical Spatial ID"
                    value={
                      verticalUlpin ? (
                        <span className="font-mono text-cyan-800 font-bold">{verticalUlpin}</span>
                      ) : (
                        '—'
                      )
                    }
                  />
                  <DetailRow
                    label="Unit Type"
                    value={flat ? (UNIT_TYPE_LABELS[flat.unitType] ?? flat.unitType) : null}
                  />
                  <DetailRow label="Carpet Area" value={flat?.area ? `${flat.area} sq ft` : null} />
                  <DetailRow label="Facing" value={flat?.facing} />
                  <DetailRow
                    label="Status"
                    value={
                      flat ? (
                        <Badge variant={FLAT_STATUS_VARIANTS[flat.status]} className="px-2 py-0.5 text-[10px]">
                          {FLAT_STATUS_LABELS[flat.status] ?? flat.status}
                        </Badge>
                      ) : null
                    }
                  />
                </dl>
              </CardContent>
            </Card>
          </div>

          {/* 3D Digital Twin Visualizer CTA */}
          <div className="rounded-2xl border border-cyan-200 bg-gradient-to-r from-cyan-900 to-blue-950 p-6 text-white shadow-lg">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-cyan-300">
                  Interactive 3D Digital Twin
                </span>
                <h3 className="text-lg font-extrabold">Explore Your Unit in the 3D Township</h3>
                <p className="text-xs text-slate-300 max-w-xl">
                  Inspect your structural floor elevation, view daylight simulations, explore internal slicing, and verify spatial alignment.
                </p>
              </div>

              {property?.society && flat && (
                <Button asChild className="bg-cyan-400 font-extrabold text-slate-950 hover:bg-cyan-300 shrink-0">
                  <Link href={`/map?society=${property.society.id}&flat=${flat.id}&mode=3d`}>
                    <Box className="h-4 w-4 mr-1.5" /> Launch 3D Viewer
                  </Link>
                </Button>
              )}
            </div>
          </div>

          <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-700">
            GIS Cadastre &amp; Spatial Record
          </p>
          <Card className="border border-slate-200 bg-white">
            <CardContent className="p-5">
              <dl>
                <DetailRow
                  label="3D Vertical Spatial ID"
                  value={
                    verticalUlpin ? (
                      <span className="font-mono text-xs font-bold text-cyan-800">{verticalUlpin}</span>
                    ) : (
                      'Not assigned'
                    )
                  }
                />
                <DetailRow
                  label="GIS Coordinates"
                  value={
                    property?.society?.location?.latitude && property?.society?.location?.longitude
                      ? `${property.society.location.latitude.toFixed(6)}°N, ${property.society.location.longitude.toFixed(6)}°E`
                      : 'Approximate centroid'
                  }
                />
                <DetailRow
                  label="GIS Data Status"
                  value={
                    <Badge variant="outline" className="text-[10px]">
                      Illustrative Cadastral Reference
                    </Badge>
                  }
                />
              </dl>
              <p className="mt-3 text-[10px] leading-relaxed text-slate-500">
                Spatial identifier follows standard Bhu-Aadhaar 14-character standard encoding for 3D vertical mapping.
                Official legal property rights are subject to government cadastral verification.
              </p>
            </CardContent>
          </Card>

          <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-700">
            Self-declared Resident Information
          </p>
          <Card className="border border-slate-200 bg-white">
            <CardContent className="p-5">
              <dl>
                <DetailRow
                  label="Occupancy Type"
                  value={OCCUPANCY_TYPE_LABELS[record.occupancy.type] ?? record.occupancy.type}
                />
                <DetailRow label="Move-in Date" value={record.occupancy.moveInDate} />
                <DetailRow label="Residents in Flat" value={String(record.occupancy.residentCount)} />
                <DetailRow label="Notes" value={record.occupancy.notes} />
                <DetailRow label="Last Updated" value={formatDate(record.updatedAt)} />
              </dl>
              <p className="mt-3 flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-[11px] font-semibold leading-relaxed text-blue-800">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                Self-declared occupancy information. This is not government/legal ownership
                verification.
              </p>
              <div className="mt-3">
                <Button variant="outline" size="sm" asChild>
                  <Link href="/resident/profile">Update Occupancy Details</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Report Modal */}
      <ReportModal
        open={reportModalOpen}
        onOpenChange={setReportModalOpen}
        reportType="PROPERTY"
        data={reportData}
      />
    </div>
  );
}
