'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Building2, Edit3, Layers, Plus, Trash2, Home, Eye, Archive, ShieldAlert,
} from 'lucide-react';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { useToast } from '@/hooks/use-toast';

import { getSocietyById } from '@/lib/society/service';
import {
  getBuildings, createBuilding, updateBuilding, deleteBuilding, archiveBuilding, buildingCodeExists,
} from '@/lib/society/buildingService';
import { getFloors } from '@/lib/society/floorService';
import { getFlats } from '@/lib/society/flatService';
import { BUILDING_TYPE_LABELS, type Building } from '@/types/society';
import { SocietyFormModal } from '@/components/society/SocietyFormModal';
import {
  type BuildingFormValues, validateBuildingForm, normalizeBuildingPayload,
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

interface SocietyAggregateStats {
  totalBuildings: number;
  totalFloors: number;
  totalFlats: number;
  occupiedFlats: number;
  availableFlats: number;
}

export default function BuildingsPage() {
  const params = useParams();
  const { toast } = useToast();
  const societyId = params.societyId as string;

  const [society, setSociety] = React.useState<{ name: string } | null>(null);
  const [buildings, setBuildings] = React.useState<Building[]>([]);
  const [stats, setStats] = React.useState<SocietyAggregateStats>({
    totalBuildings: 0, totalFloors: 0, totalFlats: 0, occupiedFlats: 0, availableFlats: 0,
  });
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [showAddForm, setShowAddForm] = React.useState(false);
  const [editingBuilding, setEditingBuilding] = React.useState<Building | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<Building | null>(null);
  const [archiveTarget, setArchiveTarget] = React.useState<Building | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [archiving, setArchiving] = React.useState(false);
  const [showArchived, setShowArchived] = React.useState(false);
  const [formErrors, setFormErrors] = React.useState<Record<string, string>>({});

  const loadAll = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [soc, bldgList] = await Promise.all([
        getSocietyById(societyId),
        getBuildings(societyId, showArchived),
      ]);
      setSociety(soc ? { name: soc.name } : null);
      setBuildings(bldgList);

      // Real aggregate statistics from Firestore: floors per building, flats per floor.
      const perBuildingFloors = await Promise.all(
        bldgList.map((b) => getFloors(societyId, b.id)),
      );
      const perFloorFlats = await Promise.all(
        perBuildingFloors.flatMap((floors, bIdx) =>
          floors.map((f) => getFlats(societyId, bldgList[bIdx].id, f.id)),
        ),
      );
      const allFlats = perFloorFlats.flat();
      setStats({
        totalBuildings: bldgList.length,
        totalFloors: perBuildingFloors.reduce((sum, fl) => sum + fl.length, 0),
        totalFlats: allFlats.length,
        occupiedFlats: allFlats.filter((f) => f.status === 'occupied').length,
        availableFlats: allFlats.filter((f) => f.status === 'available').length,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load buildings.');
    } finally {
      setLoading(false);
    }
  }, [societyId, showArchived]);

  React.useEffect(() => { loadAll(); }, [loadAll]);

  const handleAddSubmit = async (values: BuildingFormValues) => {
    setSubmitting(true);
    setFormErrors({});
    try {
      const validationErrors = validateBuildingForm(values);
      if (Object.keys(validationErrors).length > 0) {
        setFormErrors(validationErrors);
        return;
      }
      const payload = normalizeBuildingPayload(values);
      const dup = await buildingCodeExists(societyId, payload.code);
      if (dup) {
        setFormErrors({ code: `A building with code "${payload.code}" already exists in this society.` });
        return;
      }
      await createBuilding(societyId, payload);
      toast({ title: 'Building created', description: `${payload.name} was added to your society.` });
      setShowAddForm(false);
      loadAll();
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to create building.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (values: BuildingFormValues) => {
    if (!editingBuilding) return;
    setSubmitting(true);
    setFormErrors({});
    try {
      const validationErrors = validateBuildingForm(values);
      if (Object.keys(validationErrors).length > 0) {
        setFormErrors(validationErrors);
        return;
      }
      const payload = normalizeBuildingPayload(values);
      const dup = await buildingCodeExists(societyId, payload.code, editingBuilding.id);
      if (dup) {
        setFormErrors({ code: `A building with code "${payload.code}" already exists in this society.` });
        return;
      }
      await updateBuilding(societyId, editingBuilding.id, payload);
      toast({ title: 'Building updated' });
      setEditingBuilding(null);
      loadAll();
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to update building.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleArchiveConfirm = async () => {
    if (!archiveTarget) return;
    setArchiving(true);
    try {
      await archiveBuilding(societyId, archiveTarget.id, 'Archived by society administrator');
      toast({ title: 'Building archived', description: `${archiveTarget.name} has been archived safely. Historical floors and units are preserved.` });
      setArchiveTarget(null);
      loadAll();
    } catch (err) {
      toast({
        title: 'Cannot archive building',
        description: err instanceof Error ? err.message : 'Failed to archive building.',
        variant: 'destructive',
      });
    } finally {
      setArchiving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteBuilding(societyId, deleteTarget.id);
      toast({ title: 'Building deleted' });
      setDeleteTarget(null);
      loadAll();
    } catch (err) {
      toast({
        title: 'Cannot delete building',
        description: err instanceof Error ? err.message : 'This building contains floors/flats. Please archive it instead to preserve cadastral history.',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  if (error) {
    return (
      <ProtectedRoute>
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4">
            <p className="font-medium">Unable to load buildings</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="p-6 max-w-7xl mx-auto">
        <PageHeader
          title="Buildings"
          description="Manage the physical structure of your society."
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowArchived((s) => !s)}
                className="text-xs"
              >
                {showArchived ? 'Hide Archived' : 'Show Archived'}
              </Button>
              <Button onClick={() => { setEditingBuilding(null); setShowAddForm(true); }}>
                <Plus className="h-4 w-4 mr-1" />Add Building
              </Button>
            </div>
          }
        />

        {society && (
          <p className="mt-2 text-sm text-slate-600">
            Society: <span className="font-medium text-slate-900">{society.name}</span>
          </p>
        )}

        {loading ? (
          <div className="mt-6 space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
            </div>
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <StatCard title="Total Buildings" value={stats.totalBuildings} icon={<Building2 className="h-5 w-5 text-slate-600" />} />
              <StatCard title="Total Floors" value={stats.totalFloors} icon={<Layers className="h-5 w-5 text-slate-600" />} />
              <StatCard title="Total Flats" value={stats.totalFlats} icon={<Home className="h-5 w-5 text-slate-600" />} />
              <StatCard title="Occupied" value={stats.occupiedFlats} icon={<span className="text-lg">🔑</span>} />
              <StatCard title="Available" value={stats.availableFlats} icon={<span className="text-lg">✅</span>} />
            </div>

            {buildings.length === 0 ? (
              <Card className="border-slate-200">
                <CardContent className="p-6">
                  <EmptyState
                    title="No buildings added yet."
                    description="Start by adding the buildings in your society."
                    icon={<Building2 className="h-12 w-12 text-slate-300" />}
                    action={
                      <Button onClick={() => { setEditingBuilding(null); setShowAddForm(true); }}>
                        <Plus className="h-4 w-4 mr-1" />Add Building
                      </Button>
                    }
                  />
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {buildings.map((b) => (
                  <Card key={b.id} className="border-slate-200">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center justify-between text-base">
                        <span className="flex items-center gap-2">
                          <Building2 className="h-5 w-5 text-cyan-600" />
                          {b.name}
                          <span className="text-xs font-normal text-slate-500">({b.code})</span>
                        </span>
                        <Badge variant={b.status === 'active' ? 'success' : b.status === 'archived' ? 'secondary' : 'warning'}>
                          {b.status}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div>
                          <p className="text-slate-500">Type</p>
                          <p className="font-medium text-slate-900">{BUILDING_TYPE_LABELS[b.type as keyof typeof BUILDING_TYPE_LABELS] || b.type}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Floors</p>
                          <p className="font-medium text-slate-900">{b.floorCount}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Planned Flats</p>
                          <p className="font-medium text-slate-900">{b.plannedFlatCount}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Lift / Parking</p>
                          <p className="font-medium text-slate-900">
                            {b.liftAvailable ? `${b.liftCount} lift(s)` : 'No lift'} · {b.parkingAvailable ? `${b.parkingCapacity}` : 'No'}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap justify-end gap-2 pt-2 border-t">
                        <Link
                          href={`/society/${societyId}/buildings/${b.id}`}
                          className="inline-flex h-8 items-center justify-center gap-1 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" />View
                        </Link>
                        <Button size="sm" variant="outline" onClick={() => setEditingBuilding(b)}>
                          <Edit3 className="h-3.5 w-3.5 mr-1" />Edit
                        </Button>
                        {b.status !== 'archived' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setArchiveTarget(b)}
                            className="text-amber-600 border-amber-200 hover:bg-amber-50"
                          >
                            <Archive className="h-3.5 w-3.5 mr-1" />Archive
                          </Button>
                        )}
                        <Button size="sm" variant="outline" onClick={() => setDeleteTarget(b)} className="text-red-600 border-red-200 hover:bg-red-50">
                          <Trash2 className="h-3.5 w-3.5 mr-1" />Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {showAddForm && (
          <SocietyFormModal
            title="Add Building"
            initialData={undefined}
            onSubmit={handleAddSubmit}
            onClose={() => { setShowAddForm(false); setFormErrors({}); }}
            submitting={submitting}
            buildingMode
          />
        )}

        {editingBuilding && (
          <SocietyFormModal
            title="Edit Building"
            initialData={{
              name: editingBuilding.name,
              code: editingBuilding.code,
              type: editingBuilding.type,
              floorCount: String(editingBuilding.floorCount),
              basementFloors: String(editingBuilding.basementFloors || 0),
              plannedFlatCount: String(editingBuilding.plannedFlatCount || 0),
              liftAvailable: editingBuilding.liftAvailable,
              liftCount: String(editingBuilding.liftCount || 0),
              parkingAvailable: editingBuilding.parkingAvailable,
              parkingCapacity: String(editingBuilding.parkingCapacity || 0),
              description: editingBuilding.description || '',
              latitude: editingBuilding.location?.latitude?.toString() || '',
              longitude: editingBuilding.location?.longitude?.toString() || '',
            }}
            onSubmit={handleEditSubmit}
            onClose={() => { setEditingBuilding(null); setFormErrors({}); }}
            submitting={submitting}
            buildingMode
          />
        )}

        <ConfirmationDialog
          open={!!archiveTarget}
          onOpenChange={(o) => !o && setArchiveTarget(null)}
          title="Archive Building (Safe Soft-Delete)"
          description={archiveTarget
            ? `Are you sure you want to archive "${archiveTarget.name}" (${archiveTarget.code})? This will preserve all historical floor slabs, flat records, and audit logs while marking the building inactive.`
            : ''}
          confirmLabel="Archive Building"
          cancelLabel="Cancel"
          tone="default"
          onConfirm={handleArchiveConfirm}
          loading={archiving}
        />

        <ConfirmationDialog
          open={!!deleteTarget}
          onOpenChange={(o) => !o && setDeleteTarget(null)}
          title="Delete Building"
          description={deleteTarget
            ? `Are you sure you want to delete "${deleteTarget.name}" (${deleteTarget.code})? If this building contains floors or flats, deletion will be refused to prevent data loss.`
            : ''}
          confirmLabel="Delete"
          cancelLabel="Cancel"
          tone="destructive"
          onConfirm={handleDeleteConfirm}
          loading={deleting}
        />
      </div>
    </ProtectedRoute>
  );
}