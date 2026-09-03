'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  Building2, Edit3, Layers, MapPin, Plus, Trash2,
  Home, BarChart3, ChevronLeft, Eye,
} from 'lucide-react';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

import { getSocietyById } from '@/lib/society/service';
import {
  getBuilding,
  updateBuilding,
  deleteBuilding,
  buildingCodeExists,
} from '@/lib/society/buildingService';
import {
  getFloors,
  createFloor,
  updateFloor,
  deleteFloor,
  floorNumberExists,
  generateFloors,
} from '@/lib/society/floorService';
import {
  BUILDING_TYPE_LABELS, FLOOR_TYPE_LABELS,
  type Building, type Floor,
} from '@/types/society';
import { generateBuildingSpatialId, generateFloorSpatialId } from '@/lib/society/ulpinGenerator';
import { SocietyFormModal } from '@/components/society/SocietyFormModal';
import {
  type BuildingFormValues,
  normalizeBuildingPayload,
  type FloorFormValues,
  normalizeFloorPayload,
} from '@/lib/society/buildingValidation';

interface StatCardProps { title: string; value: string | number; icon: React.ReactNode; }

function StatCard({ title, value, icon }: StatCardProps) {
  return (
    <Card className="border-slate-200">
      <CardContent className="flex items-center gap-4 p-4">
        <div className="p-2 bg-slate-100 rounded-lg">{icon}</div>
        <div>
          <p className="text-xs text-slate-500">{title}</p>
          <p className="text-xl font-semibold text-slate-900">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function getFloorTypeName(type: string): string {
  return FLOOR_TYPE_LABELS[type as keyof typeof FLOOR_TYPE_LABELS] ?? type;
}

function getFloorStatusVariant(floor: Floor): 'default' | 'secondary' | 'success' | 'warning' | 'destructive' {
  switch (floor.floorType) {
    case 'basement': return 'secondary';
    case 'ground': return 'success';
    case 'residential': return 'default';
    case 'amenity': return 'warning';
    default: return 'secondary';
  }
}

function FloorFormModal({ open, onClose, editing, onSubmit, submitting }: {
  open: boolean; onClose: () => void; editing: Floor | null;
  onSubmit: (values: FloorFormValues) => Promise<void>; submitting: boolean;
}) {
  const [values, setValues] = React.useState<FloorFormValues>({
    floorNumber: '', floorLabel: '', floorType: 'residential', plannedFlatCount: '0',
  });
  React.useEffect(() => {
    if (editing) setValues({
      floorNumber: String(editing.floorNumber),
      floorLabel: editing.floorLabel,
      floorType: editing.floorType || 'other',
      plannedFlatCount: String(editing.plannedFlatCount || 0),
    });
    else setValues({ floorNumber: '', floorLabel: '', floorType: 'residential', plannedFlatCount: '0' });
  }, [editing]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{editing ? 'Edit Floor' : 'Add Floor'}</DialogTitle></DialogHeader>
        <form onSubmit={async (e) => { e.preventDefault(); await onSubmit(values); }} className="space-y-4">
          <div>
            <label htmlFor="floor-number" className="block text-[11px] font-bold tracking-tight text-slate-700">Floor Number *</label>
            <Input id="floor-number" type="number" value={values.floorNumber}
              onChange={(e) => setValues({ ...values, floorNumber: e.target.value })} placeholder="-1, 0, 1..." />
          </div>
          <div>
            <label htmlFor="floor-label" className="block text-[11px] font-bold tracking-tight text-slate-700">Floor Label *</label>
            <Input id="floor-label" value={values.floorLabel}
              onChange={(e) => setValues({ ...values, floorLabel: e.target.value })} placeholder="e.g. Ground Floor" />
          </div>
          <div>
            <label htmlFor="floor-type" className="block text-[11px] font-bold tracking-tight text-slate-700">Floor Type *</label>
            <Select id="floor-type" value={values.floorType}
              onChange={(e) => setValues({ ...values, floorType: e.target.value as FloorFormValues['floorType'] })}>
              <option value="basement">Basement</option>
              <option value="ground">Ground</option>
              <option value="residential">Residential</option>
              <option value="amenity">Amenity</option>
              <option value="other">Other</option>
            </Select>
          </div>
          <div>
            <label htmlFor="planned-flats" className="block text-[11px] font-bold tracking-tight text-slate-700">Planned Flats</label>
            <Input id="planned-flats" type="number" min="0" value={values.plannedFlatCount}
              onChange={(e) => setValues({ ...values, plannedFlatCount: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? 'Saving...' : 'Save'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
export default function BuildingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const societyId = params.societyId as string;
  const buildingId = params.buildingId as string;

  const [society, setSociety] = React.useState<{ name: string } | null>(null);
  const [building, setBuilding] = React.useState<Building | null>(null);
  const [floors, setFloors] = React.useState<Floor[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [showForm, setShowForm] = React.useState(false);
  const [editingBuilding, setEditingBuilding] = React.useState<Building | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<Building | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [showFloorForm, setShowFloorForm] = React.useState(false);
  const [editingFloor, setEditingFloor] = React.useState<Floor | null>(null);
  const [floorSubmitting, setFloorSubmitting] = React.useState(false);
  const [floorToDelete, setFloorToDelete] = React.useState<Floor | null>(null);
  const [deletingFloor, setDeletingFloor] = React.useState(false);
  const [showGenDialog, setShowGenDialog] = React.useState(false);
  const [basementInput, setBasementInput] = React.useState('');
  const [residentialInput, setResidentialInput] = React.useState('');
  const [generating, setGenerating] = React.useState(false);

  const loadBuilding = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [soc, bldg, flrList] = await Promise.all([
        getSocietyById(societyId),
        getBuilding(societyId, buildingId),
        getFloors(societyId, buildingId),
      ]);
      setSociety(soc ? { name: soc.name } : null);
      setBuilding(bldg);
      setFloors(flrList);
      if (!bldg) setError('Building not found.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load building.');
    } finally {
      setLoading(false);
    }
  }, [societyId, buildingId]);

  React.useEffect(() => { loadBuilding(); }, [loadBuilding]);

  const handleOpenEdit = () => { setEditingBuilding(building); setShowForm(true); };
  const handleOpenDelete = () => setDeleteTarget(building);

  const handleBuildingSubmit = async (values: BuildingFormValues) => {
    if (!building) return;
    setSubmitting(true);
    try {
      const payload = normalizeBuildingPayload(values);
      const dup = await buildingCodeExists(societyId, payload.code, building.id);
      if (dup) {
        toast({ title: 'Duplicate code', description: `Code "${payload.code}" already exists.`, variant: 'destructive' });
        return;
      }
      await updateBuilding(societyId, building.id, payload);
      toast({ title: 'Building updated' });
      setShowForm(false);
      loadBuilding();
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteBuilding(societyId, deleteTarget.id);
      toast({ title: 'Building deleted' });
      setDeleteTarget(null);
      router.push(`/society/${societyId}/buildings`);
    } catch (err) {
      toast({ title: 'Cannot delete', description: err instanceof Error ? err.message : 'Failed.', variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  const handleFloorSubmit = async (values: FloorFormValues) => {
    if (!building) return;
    setFloorSubmitting(true);
    try {
      const payload = normalizeFloorPayload(values);
      if (editingFloor) {
        const dup = await floorNumberExists(societyId, building.id, payload.floorNumber, editingFloor.id);
        if (dup) { toast({ title: 'Duplicate', description: 'Floor already exists.', variant: 'destructive' }); return; }
        await updateFloor(societyId, building.id, editingFloor.id, payload);
        toast({ title: 'Floor updated' });
      } else {
        const dup = await floorNumberExists(societyId, building.id, payload.floorNumber);
        if (dup) { toast({ title: 'Duplicate', description: 'Floor number already exists.', variant: 'destructive' }); return; }
        await createFloor(societyId, building.id, payload);
        toast({ title: 'Floor created' });
      }
      setShowFloorForm(false);
      loadBuilding();
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed.', variant: 'destructive' });
    } finally {
      setFloorSubmitting(false);
    }
  };

  const handleDeleteFloor = async () => {
    if (!floorToDelete || !building) return;
    setDeletingFloor(true);
    try {
      await deleteFloor(societyId, building.id, floorToDelete.id);
      toast({ title: 'Floor deleted' });
      setFloorToDelete(null);
      loadBuilding();
    } catch (err) {
      toast({ title: 'Cannot delete', description: err instanceof Error ? err.message : 'Failed.', variant: 'destructive' });
    } finally {
      setDeletingFloor(false);
    }
  };

  const handleGenerateFloors = async () => {
    if (!building) return;
    const basement = parseInt(basementInput, 10) || 0;
    const residential = parseInt(residentialInput, 10) || 0;
    if (residential < 1) {
      toast({ title: 'Invalid input', description: 'At least 1 residential floor is required.', variant: 'destructive' });
      return;
    }
    setGenerating(true);
    try {
      const created = await generateFloors(societyId, building.id, basement, residential);
      toast({ title: 'Floors generated', description: `${created} floor(s) created.` });
      setShowGenDialog(false);
      setBasementInput('');
      setResidentialInput('');
      loadBuilding();
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to generate floors.', variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };
  if (error) {
    return (
      <ProtectedRoute>
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4">
            <p className="font-medium">Unable to load building</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!building && !loading) return null;

  return (
    <ProtectedRoute>
      <div className="p-6 max-w-7xl mx-auto">
        <PageHeader
          title="Building Detail"
          description={building ? `${building.name} (${building.code})` : 'Loading building...'}
          actions={
            <div className="flex gap-2">
              <Button variant="default" size="sm" asChild>
                <Link href={`/map?society=${societyId}&building=${buildingId}`}>
                  <Layers className="h-4 w-4 mr-1" /> View on 2D GIS Map
                </Link>
              </Button>
              <Button variant="outline" onClick={() => router.push(`/society/${societyId}/buildings`)}>
                <ChevronLeft className="h-4 w-4 mr-1" />Back
              </Button>
              <Button variant="outline" onClick={handleOpenEdit}>
                <Edit3 className="h-4 w-4 mr-1" />Edit
              </Button>
            </div>
          }
        />

        {loading ? (
          <Skeleton className="h-48 w-full mt-6" />
        ) : (
          <div className="mt-6 space-y-6">
            <Card className="border-slate-200">
              <CardHeader><CardTitle>Building Information & Cadastral ID</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-1">
                    <div className="w-full h-40 bg-slate-100 rounded-lg flex items-center justify-center">
                      <Building2 className="h-12 w-12 text-slate-300" />
                    </div>
                  </div>
                  <div className="lg:col-span-2 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div><span className="text-xs text-slate-500">Building Name</span><p className="font-medium">{building?.name}</p></div>
                      <div><span className="text-xs text-slate-500">Building Code</span><p className="font-medium">{building?.code}</p></div>
                      <div>
                        <span className="text-xs text-slate-500">Spatial Building ID</span>
                        <p className="font-mono text-xs font-bold text-cyan-700">
                          {building ? generateBuildingSpatialId(societyId, building) : '—'}
                        </p>
                      </div>
                      <div><label className="text-xs text-slate-500">Type</label><p className="font-medium">{building && BUILDING_TYPE_LABELS[building.type] ? BUILDING_TYPE_LABELS[building.type] : building?.type}</p></div>
                      <div><span className="text-xs text-slate-500">Status</span><Badge variant="success">{building?.status}</Badge></div>
                    </div>
                    {building?.location && (
                      <p className="text-xs text-slate-500">
                        Coordinates are {building.location.source} and illustrative, not surveyed.
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <StatCard title="Total Floors" value={floors.length} icon={<Layers className="h-5 w-5 text-slate-600" />} />
              <StatCard title="Planned Flats" value={building?.plannedFlatCount || 0} icon={<Home className="h-5 w-5 text-slate-600" />} />
              <StatCard title="Lift(s)" value={building?.liftCount || 0} icon={<span className="text-lg">🛗</span>} />
              <StatCard title="Parking" value={building?.parkingCapacity || 0} icon={<span className="text-lg">🅿️</span>} />
            </div>

            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Floors</span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setShowGenDialog(true)}>Generate Floors</Button>
                    <Button size="sm" onClick={() => { setEditingFloor(null); setShowFloorForm(true); }}>
                      <Plus className="h-4 w-4 mr-1" />Add Floor
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {floors.length === 0 ? (
                  <EmptyState
                    title="No floors configured"
                    description="Add floors manually or use floor generation."
                    icon={<Layers className="h-12 w-12 text-slate-300" />}
                    action={
                      <Button size="sm" onClick={() => { setEditingFloor(null); setShowFloorForm(true); }}>
                        <Plus className="h-4 w-4 mr-1" />Add Floor
                      </Button>
                    }
                  />
                ) : (
                  <div className="space-y-3">
                    {floors.map((f) => (
                      <div key={f.id} className="border border-slate-200 rounded-lg p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Layers className="h-5 w-5 text-cyan-600" />
                          <div>
                            <p className="font-medium">{f.floorLabel || `Floor ${f.floorNumber}`}</p>
                            <p className="text-xs text-slate-500">{getFloorTypeName(f.floorType)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={getFloorStatusVariant(f)}>{f.status}</Badge>
                          <Link
                            href={`/society/${societyId}/buildings/${buildingId}/floors/${f.id}`}
                            className="inline-flex h-8 items-center justify-center rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
                            aria-label={`View floor ${f.floorLabel || f.floorNumber}`}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Link>
                          <Button size="sm" variant="outline" onClick={() => { setEditingFloor(f); setShowFloorForm(true); }}>
                            <Edit3 className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setFloorToDelete(f)} className="text-red-600 border-red-200 hover:bg-red-50">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button variant="outline" disabled>
                    <BarChart3 className="h-4 w-4 mr-2" />View 3D Building Preview — Coming Soon
                  </Button>
                  <Button variant="outline" onClick={handleOpenEdit}>
                    <Edit3 className="h-4 w-4 mr-2" />Edit Building
                  </Button>
                  <Button variant="outline" onClick={handleOpenDelete} className="text-red-600 border-red-200 hover:bg-red-50">
                    <Trash2 className="h-4 w-4 mr-2" />Delete Building
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
                {showForm && building && (
          <SocietyFormModal
            title={editingBuilding ? 'Edit Building' : 'Edit Building'}
            initialData={(editingBuilding || building) ? {
              name: (editingBuilding || building)!.name,
              code: (editingBuilding || building)!.code,
              type: (editingBuilding || building)!.type,
              floorCount: String((editingBuilding || building)!.floorCount),
              basementFloors: String((editingBuilding || building)!.basementFloors || 0),
              plannedFlatCount: String((editingBuilding || building)!.plannedFlatCount || 0),
              liftAvailable: (editingBuilding || building)!.liftAvailable,
              liftCount: String((editingBuilding || building)!.liftCount || 0),
              parkingAvailable: (editingBuilding || building)!.parkingAvailable,
              parkingCapacity: String((editingBuilding || building)!.parkingCapacity || 0),
              description: (editingBuilding || building)!.description || '',
              latitude: (editingBuilding || building)!.location?.latitude?.toString() || '',
              longitude: (editingBuilding || building)!.location?.longitude?.toString() || '',
            } : undefined}
            onSubmit={handleBuildingSubmit}
            onClose={() => setShowForm(false)}
            submitting={submitting}
            buildingMode
          />
        )}

        <FloorFormModal
          open={showFloorForm}
          onClose={() => setShowFloorForm(false)}
          editing={editingFloor}
          onSubmit={handleFloorSubmit}
          submitting={floorSubmitting}
        />

        <ConfirmationDialog
          open={!!floorToDelete}
          onOpenChange={(o) => !o && setFloorToDelete(null)}
          title="Delete Floor"
          description={floorToDelete
            ? `Are you sure you want to delete "${floorToDelete.floorLabel || floorToDelete.floorNumber}"? This cannot be undone.`
            : ''}
          confirmLabel="Delete"
          cancelLabel="Cancel"
          tone="destructive"
          onConfirm={handleDeleteFloor}
          loading={deletingFloor}
        />

        <ConfirmationDialog
          open={!!deleteTarget}
          onOpenChange={(o) => !o && setDeleteTarget(null)}
          title="Delete Building"
          description={deleteTarget
            ? `Are you sure you want to delete "${deleteTarget.name}"? This cannot be undone.`
            : ''}
          confirmLabel="Delete"
          cancelLabel="Cancel"
          tone="destructive"
          onConfirm={handleDeleteConfirm}
          loading={deleting}
        />

        <Dialog open={showGenDialog} onOpenChange={setShowGenDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Generate Floors</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                This will automatically create floors for this building. Existing floors will be skipped.
              </p>
              <div>
                <label htmlFor="basement-input" className="block text-[11px] font-bold tracking-tight text-slate-700">Basement Floors</label>
                <Input id="basement-input" type="number" min="0" max="10"
                  value={basementInput}
                  onChange={(e) => setBasementInput(e.target.value)}
                  placeholder="e.g. 1" />
              </div>
              <div>
                <label htmlFor="residential-input" className="block text-[11px] font-bold tracking-tight text-slate-700">Residential Floors *</label>
                <Input id="residential-input" type="number" min="1" max="200"
                  value={residentialInput}
                  onChange={(e) => setResidentialInput(e.target.value)}
                  placeholder="e.g. 10" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t mt-4">
              <Button variant="outline" onClick={() => setShowGenDialog(false)} disabled={generating}>Cancel</Button>
              <Button onClick={handleGenerateFloors} disabled={generating}>
                {generating ? 'Generating...' : 'Generate'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  );
}