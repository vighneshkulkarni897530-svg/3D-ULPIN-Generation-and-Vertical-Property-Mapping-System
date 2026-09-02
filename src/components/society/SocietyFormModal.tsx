'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  BuildingFormValues, BuildingErrors, validateBuildingForm,
} from '@/lib/society/buildingValidation';

interface BuildingFormModalProps {
  title: string;
  initialData?: BuildingFormValues;
  onSubmit: (values: BuildingFormValues) => Promise<void>;
  onClose: () => void;
  submitting: boolean;
  buildingMode?: boolean;
}

const DEFAULT_VALUES: BuildingFormValues = {
  name: '', code: '', type: '', floorCount: '', basementFloors: '0',
  plannedFlatCount: '0', liftAvailable: false, liftCount: '0',
  parkingAvailable: false, parkingCapacity: '0', description: '',
  latitude: '', longitude: '',
};

const BUILDING_TYPES = [
  { value: 'Residential', label: 'Residential' },
  { value: 'Commercial', label: 'Commercial' },
  { value: 'Mixed Use', label: 'Mixed Use' },
  { value: 'Amenity', label: 'Amenity' },
  { value: 'Parking', label: 'Parking' },
  { value: 'Other', label: 'Other' },
];

export function SocietyFormModal({ title, initialData, onSubmit, onClose, submitting, buildingMode }: BuildingFormModalProps) {
  const [values, setValues] = React.useState<BuildingFormValues>(initialData || DEFAULT_VALUES);
  const [errors, setErrors] = React.useState<BuildingErrors>({});

  const handleChange = (field: keyof BuildingFormValues, value: string | boolean) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validateBuildingForm(values);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    await onSubmit(values);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-900">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="building-name" className="block text-[11px] font-bold tracking-tight text-slate-700">Building Name *</label>
                <Input id="building-name" value={values.name} onChange={(e) => handleChange('name', e.target.value)} placeholder="e.g. Tower A" aria-invalid={!!errors.name} aria-describedby={errors.name ? 'building-name-error' : undefined} />
                {errors.name && <p id="building-name-error" role="alert" className="text-xs text-red-600 mt-1">{errors.name}</p>}
              </div>
              <div>
                <label htmlFor="building-code" className="block text-[11px] font-bold tracking-tight text-slate-700">Building Code *</label>
                <Input id="building-code" value={values.code} onChange={(e) => handleChange('code', e.target.value)} placeholder="e.g. A" aria-invalid={!!errors.code} aria-describedby={errors.code ? 'building-code-error' : undefined} />
                {errors.code && <p id="building-code-error" role="alert" className="text-xs text-red-600 mt-1">{errors.code}</p>}
              </div>
            </div>
            <div>
              <label htmlFor="building-type" className="block text-[11px] font-bold tracking-tight text-slate-700">Building Type *</label>
              <Select id="building-type" value={values.type} onChange={(e) => handleChange('type', e.target.value)} aria-invalid={!!errors.type} aria-describedby={errors.type ? 'building-type-error' : undefined}>
                {BUILDING_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </Select>
              {errors.type && <p id="building-type-error" role="alert" className="text-xs text-red-600 mt-1">{errors.type}</p>}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-900">Configuration</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="floor-count" className="block text-[11px] font-bold tracking-tight text-slate-700">Number of Floors *</label>
                <Input id="floor-count" type="number" min="1" value={values.floorCount} onChange={(e) => handleChange('floorCount', e.target.value)} aria-invalid={!!errors.floorCount} aria-describedby={errors.floorCount ? 'floor-count-error' : undefined} />
                {errors.floorCount && <p id="floor-count-error" role="alert" className="text-xs text-red-600 mt-1">{errors.floorCount}</p>}
              </div>
              <div>
                <label htmlFor="basement-floors" className="block text-[11px] font-bold tracking-tight text-slate-700">Basement Floors</label>
                <Input id="basement-floors" type="number" min="0" value={values.basementFloors} onChange={(e) => handleChange('basementFloors', e.target.value)} aria-invalid={!!errors.basementFloors} aria-describedby={errors.basementFloors ? 'basement-floors-error' : undefined} />
                {errors.basementFloors && <p id="basement-floors-error" role="alert" className="text-xs text-red-600 mt-1">{errors.basementFloors}</p>}
              </div>
              <div>
                <label htmlFor="planned-flats" className="block text-[11px] font-bold tracking-tight text-slate-700">Total Planned Flats</label>
                <Input id="planned-flats" type="number" min="0" value={values.plannedFlatCount} onChange={(e) => handleChange('plannedFlatCount', e.target.value)} aria-invalid={!!errors.plannedFlatCount} aria-describedby={errors.plannedFlatCount ? 'planned-flats-error' : undefined} />
                {errors.plannedFlatCount && <p id="planned-flats-error" role="alert" className="text-xs text-red-600 mt-1">{errors.plannedFlatCount}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold tracking-tight text-slate-700">Lift Available</label>
                <div className="flex gap-4 mt-1">
                  <label className="flex items-center gap-2">
                    <input type="radio" name="lift" checked={values.liftAvailable === true} onChange={() => handleChange('liftAvailable', true)} />
                    <span className="text-sm">Yes</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="radio" name="lift" checked={values.liftAvailable === false} onChange={() => handleChange('liftAvailable', false)} />
                    <span className="text-sm">No</span>
                  </label>
                </div>
              </div>
              {values.liftAvailable && (
                <div>
                  <label htmlFor="lift-count" className="block text-[11px] font-bold tracking-tight text-slate-700">Number of Lifts</label>
                  <Input id="lift-count" type="number" min="1" value={values.liftCount} onChange={(e) => handleChange('liftCount', e.target.value)} aria-invalid={!!errors.liftCount} aria-describedby={errors.liftCount ? 'lift-count-error' : undefined} />
                  {errors.liftCount && <p id="lift-count-error" role="alert" className="text-xs text-red-600 mt-1">{errors.liftCount}</p>}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold tracking-tight text-slate-700">Parking Available</label>
                <div className="flex gap-4 mt-1">
                  <label className="flex items-center gap-2">
                    <input type="radio" name="parking" checked={values.parkingAvailable === true} onChange={() => handleChange('parkingAvailable', true)} />
                    <span className="text-sm">Yes</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="radio" name="parking" checked={values.parkingAvailable === false} onChange={() => handleChange('parkingAvailable', false)} />
                    <span className="text-sm">No</span>
                  </label>
                </div>
              </div>
              {values.parkingAvailable && (
                <div>
                  <label htmlFor="parking-capacity" className="block text-[11px] font-bold tracking-tight text-slate-700">Parking Capacity</label>
                  <Input id="parking-capacity" type="number" min="1" value={values.parkingCapacity} onChange={(e) => handleChange('parkingCapacity', e.target.value)} aria-invalid={!!errors.parkingCapacity} aria-describedby={errors.parkingCapacity ? 'parking-capacity-error' : undefined} />
                  {errors.parkingCapacity && <p id="parking-capacity-error" role="alert" className="text-xs text-red-600 mt-1">{errors.parkingCapacity}</p>}
                </div>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="building-description" className="block text-[11px] font-bold tracking-tight text-slate-700">Description</label>
            <Textarea id="building-description" value={values.description} onChange={(e) => handleChange('description', e.target.value)} rows={3} aria-invalid={!!errors.description} aria-describedby={errors.description ? 'building-description-error' : undefined} />
            {errors.description && <p id="building-description-error" role="alert" className="text-xs text-red-600 mt-1">{errors.description}</p>}
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-900">Approximate Location</h3>
            <p className="text-xs text-slate-500">Location is user-provided and intended for visualization. It is not a surveyed/legal boundary.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="building-latitude" className="block text-[11px] font-bold tracking-tight text-slate-700">Latitude</label>
                <Input id="building-latitude" value={values.latitude} onChange={(e) => handleChange('latitude', e.target.value)} placeholder="e.g. 18.5204" aria-invalid={!!errors.latitude} aria-describedby={errors.latitude ? 'building-latitude-error' : undefined} />
                {errors.latitude && <p id="building-latitude-error" role="alert" className="text-xs text-red-600 mt-1">{errors.latitude}</p>}
              </div>
              <div>
                <label htmlFor="building-longitude" className="block text-[11px] font-bold tracking-tight text-slate-700">Longitude</label>
                <Input id="building-longitude" value={values.longitude} onChange={(e) => handleChange('longitude', e.target.value)} placeholder="e.g. 73.8567" aria-invalid={!!errors.longitude} aria-describedby={errors.longitude ? 'building-longitude-error' : undefined} />
                {errors.longitude && <p id="building-longitude-error" role="alert" className="text-xs text-red-600 mt-1">{errors.longitude}</p>}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? 'Saving...' : 'Save Building'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}