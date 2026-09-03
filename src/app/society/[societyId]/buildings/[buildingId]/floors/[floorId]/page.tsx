'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Layers, Plus, Trash2, Edit3, Home, ChevronLeft, BarChart3 } from 'lucide-react';

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
import { getBuilding } from '@/lib/society/buildingService';
import { getFloor, updateFloor, deleteFloor, floorNumberExists } from '@/lib/society/floorService';
import { getFlats, createFlat, updateFlat, deleteFlat, flatNumberExists } from '@/lib/society/flatService';
import {
  FLOOR_TYPE_LABELS, UNIT_TYPE_LABELS, FLAT_STATUS_LABELS, FLAT_STATUS_VARIANTS,
  type Floor, type Flat, type Building,
} from '@/types/society';
import {
  type FloorFormValues, normalizeFloorPayload,
  type FlatFormValues, normalizeFlatPayload,
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

function FloorFormModal({ open, onClose, editing, onSubmit, submitting }: {
  open: boolean; onClose: () => void; editing: Floor | null;
  onSubmit: (values: FloorFormValues) => Promise<void>; submitting: boolean;
}) {
  const [values, setValues] = React.useState<FloorFormValues>({
    floorNumber: '', floorLabel: '', floorType: 'residential', plannedFlatCount: '0',
  });
  React.useEffect(() => {
    if (editing) setValues({
      floorNumber: String(editing.floorNumber), floorLabel: editing.floorLabel,
      floorType: editing.floorType || 'other', plannedFlatCount: String(editing.plannedFlatCount || 0),
    });
    else setValues({ floorNumber: '', floorLabel: '', floorType: 'residential', plannedFlatCount: '0' });
  }, [editing]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{editing ? 'Edit Floor' : 'Add Floor'}</DialogTitle></DialogHeader>
        <form onSubmit={async (e) => { e.preventDefault(); await onSubmit(values); }} className="space-y-4">
          <div>
            <label htmlFor="fl-number" className="block text-[11px] font-bold tracking-tight text-slate-700">Floor Number *</label>
            <Input id="fl-number" type="number" value={values.floorNumber}
              onChange={(e) => setValues({ ...values, floorNumber: e.target.value })} placeholder="-1, 0, 1..." />
          </div>
          <div>
            <label htmlFor="fl-label" className="block text-[11px] font-bold tracking-tight text-slate-700">Floor Label *</label>
            <Input id="fl-label" value={values.floorLabel}
              onChange={(e) => setValues({ ...values, floorLabel: e.target.value })} placeholder="e.g. Ground Floor" />
          </div>
          <div>
            <label htmlFor="fl-type" className="block text-[11px] font-bold tracking-tight text-slate-700">Floor Type *</label>
            <Select id="fl-type" value={values.floorType}
              onChange={(e) => setValues({ ...values, floorType: e.target.value as FloorFormValues['floorType'] })}>
              <option value="basement">Basement</option>
              <option value="ground">Ground</option>
              <option value="residential">Residential</option>
              <option value="amenity">Amenity</option>
              <option value="other">Other</option>
            </Select>
          </div>
          <div>
            <label htmlFor="fl-planned" className="block text-[11px] font-bold tracking-tight text-slate-700">Planned Flats</label>
            <Input id="fl-planned" type="number" min="0" value={values.plannedFlatCount}
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

function FlatFormModal({ open, onClose, editing, onSubmit, submitting }: {
  open: boolean; onClose: () => void; editing: Flat | null;
  onSubmit: (values: FlatFormValues) => Promise<void>; submitting: boolean;
}) {
  const [values, setValues] = React.useState<FlatFormValues>({
    flatNumber: '', unitType: '2 BHK', area: '', floorPosition: '',
    facing: '', bedrooms: '', bathrooms: '', balconyCount: '',
    parkingSpaces: '0', status: 'available', description: '',
  });

  React.useEffect(() => {
    if (editing) setValues({
      flatNumber: editing.flatNumber, unitType: editing.unitType,
      area: editing.area?.toString() || '', floorPosition: editing.floorPosition?.toString() || '',
      facing: editing.facing || '', bedrooms: editing.bedrooms?.toString() || '',
      bathrooms: editing.bathrooms?.toString() || '', balconyCount: editing.balconyCount?.toString() || '',
      parkingSpaces: String(editing.parkingSpaces || 0), status: editing.status,
      description: editing.description || '',
    });
    else setValues({
      flatNumber: '', unitType: '2 BHK', area: '', floorPosition: '',
      facing: '', bedrooms: '', bathrooms: '', balconyCount: '',
      parkingSpaces: '0', status: 'available', description: '',
    });
  }, [editing]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editing ? 'Edit Flat' : 'Add Flat'}</DialogTitle></DialogHeader>
        <form onSubmit={async (e) => { e.preventDefault(); await onSubmit(values); }} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="ft-number" className="block text-[11px] font-bold tracking-tight text-slate-700">Flat Number *</label>
              <Input id="ft-number" value={values.flatNumber}
                onChange={(e) => setValues({ ...values, flatNumber: e.target.value })} placeholder="e.g. 101" />
            </div>
            <div>
              <label htmlFor="ft-unit" className="block text-[11px] font-bold tracking-tight text-slate-700">Unit Type *</label>
              <Select id="ft-unit" value={values.unitType}
                onChange={(e) => setValues({ ...values, unitType: e.target.value as FlatFormValues['unitType'] })}>
                <option value="Studio">Studio</option>
                <option value="1 BHK">1 BHK</option>
                <option value="2 BHK">2 BHK</option>
                <option value="3 BHK">3 BHK</option>
                <option value="4 BHK">4 BHK</option>
                <option value="5 BHK">5 BHK</option>
                <option value="Penthouse">Penthouse</option>
                <option value="Shop">Shop</option>
                <option value="Office">Office</option>
                <option value="Other">Other</option>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="ft-area" className="block text-[11px] font-bold tracking-tight text-slate-700">Area (sqft)</label>
              <Input id="ft-area" type="number" min="0" value={values.area}
                onChange={(e) => setValues({ ...values, area: e.target.value })} />
            </div>
            <div>
              <label htmlFor="ft-floor-pos" className="block text-[11px] font-bold tracking-tight text-slate-700">Floor Position</label>
              <Input id="ft-floor-pos" type="number" min="0" value={values.floorPosition}
                onChange={(e) => setValues({ ...values, floorPosition: e.target.value })} />
            </div>
            <div>
              <label htmlFor="ft-facing" className="block text-[11px] font-bold tracking-tight text-slate-700">Facing</label>
              <Select id="ft-facing" value={values.facing}
                onChange={(e) => setValues({ ...values, facing: e.target.value })}>
                <option value="">Select</option>
                <option value="North">North</option>
                <option value="South">South</option>
                <option value="East">East</option>
                <option value="West">West</option>
                <option value="North-East">North-East</option>
                <option value="North-West">North-West</option>
                <option value="South-East">South-East</option>
                <option value="South-West">South-West</option>
              </Select>
            </div>
            <div>
              <label htmlFor="ft-status" className="block text-[11px] font-bold tracking-tight text-slate-700">Status *</label>
              <Select id="ft-status" value={values.status}
                onChange={(e) => setValues({ ...values, status: e.target.value as FlatFormValues['status'] })}>
                <option value="available">Available</option>
                <option value="occupied">Occupied</option>
                <option value="reserved">Reserved</option>
                <option value="under-maintenance">Under Maintenance</option>
                <option value="not-available">Not Available</option>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label htmlFor="ft-bed" className="block text-[11px] font-bold tracking-tight text-slate-700">Bedrooms</label>
              <Input id="ft-bed" type="number" min="0" value={values.bedrooms}
                onChange={(e) => setValues({ ...values, bedrooms: e.target.value })} />
            </div>
            <div>
              <label htmlFor="ft-bath" className="block text-[11px] font-bold tracking-tight text-slate-700">Bathrooms</label>
              <Input id="ft-bath" type="number" min="0" value={values.bathrooms}
                onChange={(e) => setValues({ ...values, bathrooms: e.target.value })} />
            </div>
            <div>
              <label htmlFor="ft-balc" className="block text-[11px] font-bold tracking-tight text-slate-700">Balconies</label>
              <Input id="ft-balc" type="number" min="0" value={values.balconyCount}
                onChange={(e) => setValues({ ...values, balconyCount: e.target.value })} />
            </div>
            <div>
              <label htmlFor="ft-park" className="block text-[11px] font-bold tracking-tight text-slate-700">Parking Spaces</label>
              <Input id="ft-park" type="number" min="0" value={values.parkingSpaces}
                onChange={(e) => setValues({ ...values, parkingSpaces: e.target.value })} />
            </div>
          </div>
          <div>
            <label htmlFor="ft-description" className="block text-[11px] font-bold tracking-tight text-slate-700">Description</label>
            <Textarea id="ft-description" value={values.description}
              onChange={(e) => setValues({ ...values, description: e.target.value })} rows={2} />
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? 'Saving...' : 'Save Flat'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function FloorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const societyId = params.societyId as string;
  const buildingId = params.buildingId as string;
  const floorId = params.floorId as string;

  const [building, setBuilding] = React.useState<Building | null>(null);
  const [floor, setFloor] = React.useState<Floor | null>(null);
  const [flats, setFlats] = React.useState<Flat[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [showFloorForm, setShowFloorForm] = React.useState(false);
  const [editingFloor, setEditingFloor] = React.useState<Floor | null>(null);
  const [floorSubmitting, setFloorSubmitting] = React.useState(false);
  const [floorToDelete, setFloorToDelete] = React.useState<Floor | null>(null);
  const [deletingFloor, setDeletingFloor] = React.useState(false);
  const [showFlatForm, setShowFlatForm] = React.useState(false);
  const [editingFlat, setEditingFlat] = React.useState<Flat | null>(null);
  const [flatSubmitting, setFlatSubmitting] = React.useState(false);
  const [flatToDelete, setFlatToDelete] = React.useState<Flat | null>(null);
  const [deletingFlat, setDeletingFlat] = React.useState(false);

  const loadAll = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [bldg, flr, fltList] = await Promise.all([
        getBuilding(societyId, buildingId),
        getFloor(societyId, buildingId, floorId),
        getFlats(societyId, buildingId, floorId),
      ]);
      setBuilding(bldg);
      setFloor(flr);
      setFlats(fltList);
      if (!flr) setError('Floor not found.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load floor.');
    } finally {
      setLoading(false);
    }
  }, [societyId, buildingId, floorId]);

  React.useEffect(() => { loadAll(); }, [loadAll]);

  const handleFloorSubmit = async (values: FloorFormValues) => {
    if (!building || !floor) return;
    setFloorSubmitting(true);
    try {
      const payload = normalizeFloorPayload(values);
      const dup = await floorNumberExists(societyId, building.id, payload.floorNumber, floor.id);
      if (dup) {
        toast({ title: 'Duplicate floor', description: 'A floor with this number already exists in this building.', variant: 'destructive' });
        return;
      }
      await updateFloor(societyId, building.id, floor.id, payload);
      toast({ title: 'Floor updated' });
      setShowFloorForm(false);
      loadAll();
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to update floor.', variant: 'destructive' });
    } finally {
      setFloorSubmitting(false);
    }
  };

  const handleDeleteFloorConfirm = async () => {
    if (!floorToDelete || !building) return;
    setDeletingFloor(true);
    try {
      await deleteFloor(societyId, building.id, floorToDelete.id);
      toast({ title: 'Floor deleted' });
      setFloorToDelete(null);
      router.push(`/society/${societyId}/buildings/${buildingId}`);
    } catch (err) {
      toast({ title: 'Cannot delete', description: err instanceof Error ? err.message : 'Failed to delete floor.', variant: 'destructive' });
    } finally {
      setDeletingFloor(false);
    }
  };

  const handleFlatSubmit = async (values: FlatFormValues) => {
    if (!building || !floor) return;
    setFlatSubmitting(true);
    try {
      const payload = normalizeFlatPayload(values);
      const dup = await flatNumberExists(societyId, building.id, floor.id, payload.flatNumber, editingFlat?.id);
      if (dup) {
        toast({ title: 'Duplicate flat', description: `Flat ${payload.flatNumber} already exists on this floor.`, variant: 'destructive' });
        return;
      }
      if (editingFlat) {
        await updateFlat(societyId, building.id, floor.id, editingFlat.id, payload);
        toast({ title: 'Flat updated' });
      } else {
        await createFlat(societyId, building.id, floor.id, payload);
        toast({ title: 'Flat created' });
      }
      setShowFlatForm(false);
      loadAll();
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to save flat.', variant: 'destructive' });
    } finally {
      setFlatSubmitting(false);
    }
  };

  const handleDeleteFlatConfirm = async () => {
    if (!flatToDelete || !building || !floor) return;
    setDeletingFlat(true);
    try {
      await deleteFlat(societyId, building.id, floor.id, flatToDelete.id);
      toast({ title: 'Flat deleted' });
      setFlatToDelete(null);
      loadAll();
    } catch (err) {
      toast({ title: 'Cannot delete', description: err instanceof Error ? err.message : 'Failed to delete flat.', variant: 'destructive' });
    } finally {
      setDeletingFlat(false);
    }
  };

  if (error) {
    return (
      <ProtectedRoute>
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4">
            <p className="font-medium">Unable to load floor</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!floor && !loading) return null;

  const availableCount = flats.filter((f) => f.status === 'available').length;
  const occupiedCount = flats.filter((f) => f.status === 'occupied').length;

  return (
    <ProtectedRoute>
      <div className="p-6 max-w-7xl mx-auto">
        <PageHeader
          title="Floor Detail"
          description={floor ? `${floor.floorLabel || `Floor ${floor.floorNumber}`}` : 'Loading floor...'}
          actions={
            <Button variant="outline" onClick={() => router.push(`/society/${societyId}/buildings/${buildingId}`)}>
              <ChevronLeft className="h-4 w-4 mr-1" />Back to Building
            </Button>
          }
        />

        {loading ? <Skeleton className="h-40 w-full mt-6" /> : (
          <div className="mt-6 space-y-6">
            <Card className="border-slate-200">
              <CardHeader><CardTitle>Floor Information</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div><span className="text-xs text-slate-500">Floor Label</span><p className="font-medium">{floor?.floorLabel}</p></div>
                  <div><span className="text-xs text-slate-500">Floor Number</span><p className="font-medium">{floor?.floorNumber}</p></div>
                  <div><span className="text-xs text-slate-500">Floor Type</span><p className="font-medium">{FLOOR_TYPE_LABELS[floor?.floorType as keyof typeof FLOOR_TYPE_LABELS] || floor?.floorType}</p></div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Total Flats" value={flats.length} icon={<Home className="h-5 w-5 text-slate-600" />} />
              <StatCard title="Available" value={availableCount} icon={<span className="text-lg">✅</span>} />
              <StatCard title="Occupied" value={occupiedCount} icon={<span className="text-lg">🔑</span>} />
              <StatCard title="Other Status" value={flats.length - availableCount - occupiedCount} icon={<span className="text-lg">📋</span>} />
            </div>

            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Flats</span>
                  <Button size="sm" onClick={() => { setEditingFlat(null); setShowFlatForm(true); }}>
                    <Plus className="h-4 w-4 mr-1" />Add Flat
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {flats.length === 0 ? (
                  <EmptyState
                    title="No flats added on this floor."
                    description="Add flats to start managing units."
                    icon={<Home className="h-12 w-12 text-slate-300" />}
                    action={
                      <Button size="sm" onClick={() => { setEditingFlat(null); setShowFlatForm(true); }}>
                        <Plus className="h-4 w-4 mr-1" />Add Flat
                      </Button>
                    }
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left">
                          <th className="pb-2 text-xs font-medium text-slate-500">Flat Number</th>
                          <th className="pb-2 text-xs font-medium text-slate-500">Type</th>
                          <th className="pb-2 text-xs font-medium text-slate-500">Area (sqft)</th>
                          <th className="pb-2 text-xs font-medium text-slate-500">Facing</th>
                          <th className="pb-2 text-xs font-medium text-slate-500">Bedrooms</th>
                          <th className="pb-2 text-xs font-medium text-slate-500">Status</th>
                          <th className="pb-2 text-xs font-medium text-slate-500 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {flats.map((f) => (
                          <tr key={f.id} className="border-b last:border-0">
                            <td className="py-2 font-medium text-slate-900">{f.flatNumber}</td>
                            <td className="py-2 text-slate-600">{UNIT_TYPE_LABELS[f.unitType as keyof typeof UNIT_TYPE_LABELS] || f.unitType}</td>
                            <td className="py-2 text-slate-600">{f.area != null ? f.area : '-'}</td>
                            <td className="py-2 text-slate-600">{f.facing || '-'}</td>
                            <td className="py-2 text-slate-600">{f.bedrooms != null ? f.bedrooms : '-'}</td>
                            <td className="py-2">
                              <Badge variant={FLAT_STATUS_VARIANTS[f.status as keyof typeof FLAT_STATUS_VARIANTS]}>
                                {FLAT_STATUS_LABELS[f.status as keyof typeof FLAT_STATUS_LABELS] || f.status}
                              </Badge>
                            </td>
                            <td className="py-2 text-right">
                              <div className="flex gap-1 justify-end">
                                <Button size="sm" variant="outline" onClick={() => { setEditingFlat(f); setShowFlatForm(true); }} aria-label={`Edit flat ${f.flatNumber}`}>
                                  <Edit3 className="h-3.5 w-3.5" />
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => setFlatToDelete(f)} className="text-red-600 border-red-200 hover:bg-red-50" aria-label={`Delete flat ${f.flatNumber}`}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardHeader><CardTitle>Floor Actions</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  <Button variant="outline" onClick={() => { setEditingFloor(floor); setShowFloorForm(true); }}>
                    <Edit3 className="h-4 w-4 mr-2" />Edit Floor
                  </Button>
                  <Button variant="outline" disabled>
                    <BarChart3 className="h-4 w-4 mr-2" />3D Floor Preview — Coming Soon
                  </Button>
                  <Button variant="outline" onClick={() => setFloorToDelete(floor)} className="text-red-600 border-red-200 hover:bg-red-50">
                    <Trash2 className="h-4 w-4 mr-2" />Delete Floor
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <FloorFormModal
          open={showFloorForm}
          onClose={() => setShowFloorForm(false)}
          editing={editingFloor}
          onSubmit={handleFloorSubmit}
          submitting={floorSubmitting}
        />

        <FlatFormModal
          open={showFlatForm}
          onClose={() => setShowFlatForm(false)}
          editing={editingFlat}
          onSubmit={handleFlatSubmit}
          submitting={flatSubmitting}
        />

        <ConfirmationDialog
          open={!!floorToDelete}
          onOpenChange={(o) => !o && setFloorToDelete(null)}
          title="Delete Floor"
          description={floorToDelete
            ? `This floor contains ${flats.length} flat(s). Floors with flats cannot be deleted — remove the flats first.`
            : ''}
          confirmLabel="Delete"
          cancelLabel="Cancel"
          tone="destructive"
          onConfirm={handleDeleteFloorConfirm}
          loading={deletingFloor}
        />

        <ConfirmationDialog
          open={!!flatToDelete}
          onOpenChange={(o) => !o && setFlatToDelete(null)}
          title="Delete Flat"
          description={flatToDelete
            ? `Are you sure you want to delete flat ${flatToDelete.flatNumber}? This cannot be undone.`
            : ''}
          confirmLabel="Delete"
          cancelLabel="Cancel"
          tone="destructive"
          onConfirm={handleDeleteFlatConfirm}
          loading={deletingFlat}
        />
      </div>
    </ProtectedRoute>
  );
}