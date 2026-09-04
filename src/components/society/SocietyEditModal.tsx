'use client';

/**
 * SocietyEditModal.tsx
 * =====================
 * Comprehensive modal for editing society metadata, address, geo-location,
 * status, and cover image.
 */
import * as React from 'react';
import {
  Building2,
  Calendar,
  Check,
  FileText,
  Globe,
  Hash,
  ImageIcon,
  Info,
  Loader2,
  MapPin,
  Save,
  Shield,
  Upload,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { SafeImage } from '@/components/ui/SafeImage';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { updateSociety } from '@/lib/society/service';
import { uploadSocietyImageSafe } from '@/lib/society/storage';
import {
  SOCIETY_TYPES,
  SOCIETY_STATUSES,
  type Society,
  type SocietyType,
  type SocietyStatus,
  type SocietyUpdatePayload,
} from '@/types/society';

interface SocietyEditModalProps {
  society: Society;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: (updated: Society) => void;
  initialTab?: 'general' | 'address' | 'location' | 'image';
}

type TabType = 'general' | 'address' | 'location' | 'image';

export function SocietyEditModal({
  society,
  isOpen,
  onClose,
  onUpdated,
  initialTab = 'general',
}: SocietyEditModalProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = React.useState<TabType>(initialTab);

  // Form State
  const [name, setName] = React.useState(society.name || '');
  const [type, setType] = React.useState<SocietyType>((society.type as SocietyType) || 'Residential Society');
  const [registrationNumber, setRegistrationNumber] = React.useState(society.registrationNumber || '');
  const [establishedYear, setEstablishedYear] = React.useState(society.establishedYear ? String(society.establishedYear) : '');
  const [status, setStatus] = React.useState<SocietyStatus>(society.status || 'active');
  const [description, setDescription] = React.useState(society.description || '');

  // Address State
  const [line1, setLine1] = React.useState(society.address?.line1 || '');
  const [line2, setLine2] = React.useState(society.address?.line2 || '');
  const [city, setCity] = React.useState(society.address?.city || '');
  const [district, setDistrict] = React.useState(society.address?.district || '');
  const [stateName, setStateName] = React.useState(society.address?.state || '');
  const [pinCode, setPinCode] = React.useState(society.address?.pinCode || '');

  // Location State
  const [latitude, setLatitude] = React.useState(
    society.location?.latitude !== null && society.location?.latitude !== undefined
      ? String(society.location.latitude)
      : ''
  );
  const [longitude, setLongitude] = React.useState(
    society.location?.longitude !== null && society.location?.longitude !== undefined
      ? String(society.location.longitude)
      : ''
  );

  // Image State
  const [imageUrl, setImageUrl] = React.useState(society.imageUrl || '');
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(society.imageUrl || null);
  const [uploadProgress, setUploadProgress] = React.useState<number | null>(null);

  // Validation & Submission
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Reset or sync when modal opens or society changes
  React.useEffect(() => {
    if (isOpen) {
      setName(society.name || '');
      setType((society.type as SocietyType) || 'Residential Society');
      setRegistrationNumber(society.registrationNumber || '');
      setEstablishedYear(society.establishedYear ? String(society.establishedYear) : '');
      setStatus(society.status || 'active');
      setDescription(society.description || '');

      setLine1(society.address?.line1 || '');
      setLine2(society.address?.line2 || '');
      setCity(society.address?.city || '');
      setDistrict(society.address?.district || '');
      setStateName(society.address?.state || '');
      setPinCode(society.address?.pinCode || '');

      setLatitude(
        society.location?.latitude !== null && society.location?.latitude !== undefined
          ? String(society.location.latitude)
          : ''
      );
      setLongitude(
        society.location?.longitude !== null && society.location?.longitude !== undefined
          ? String(society.location.longitude)
          : ''
      );

      setImageUrl(society.imageUrl || '');
      setSelectedFile(null);
      setPreviewUrl(society.imageUrl || null);
      setErrors({});
      setActiveTab(initialTab);
    }
  }, [isOpen, society, initialTab]);

  // Handle local file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: 'destructive',
        title: 'File too large',
        description: 'Image size must be less than 5 MB.',
      });
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleClearImage = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setImageUrl('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      toast({
        variant: 'destructive',
        title: 'Geolocation not supported',
        description: 'Your browser does not support automatic location detection.',
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(6));
        setLongitude(pos.coords.longitude.toFixed(6));
        toast({
          title: 'Coordinates updated',
          description: `Location set to ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`,
        });
      },
      (err) => {
        toast({
          variant: 'destructive',
          title: 'Could not get location',
          description: err.message || 'Please verify location permissions.',
        });
      }
    );
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Society name is required.';
    }

    if (establishedYear.trim()) {
      const yearNum = parseInt(establishedYear.trim(), 10);
      const currentYear = new Date().getFullYear();
      if (isNaN(yearNum) || yearNum < 1800 || yearNum > currentYear + 1) {
        newErrors.establishedYear = `Enter a valid year between 1800 and ${currentYear + 1}.`;
      }
    }

    if (pinCode.trim() && !/^\d{6}$/.test(pinCode.trim())) {
      newErrors.pinCode = 'PIN code must be a valid 6-digit number.';
    }

    if (latitude.trim()) {
      const lat = parseFloat(latitude.trim());
      if (isNaN(lat) || lat < -90 || lat > 90) {
        newErrors.latitude = 'Latitude must be a valid number between -90 and 90.';
      }
    }

    if (longitude.trim()) {
      const lng = parseFloat(longitude.trim());
      if (isNaN(lng) || lng < -180 || lng > 180) {
        newErrors.longitude = 'Longitude must be a valid number between -180 and 180.';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast({
        variant: 'destructive',
        title: 'Please fix validation errors',
        description: 'Review the highlighted fields before saving.',
      });
      return;
    }

    setSaving(true);
    setUploadProgress(null);

    try {
      let finalImageUrl = imageUrl || null;

      // Handle image upload if a new file was chosen
      if (selectedFile) {
        setUploadProgress(0);
        const uploadResult = await uploadSocietyImageSafe(society.id, selectedFile, (p) => {
          setUploadProgress(p);
        });
        if (uploadResult.url) {
          finalImageUrl = uploadResult.url;
        } else if (uploadResult.warning) {
          toast({
            variant: 'warning',
            title: 'Image notice',
            description: uploadResult.warning,
          });
        }
      }

      const parsedLat = latitude.trim() ? parseFloat(latitude.trim()) : null;
      const parsedLng = longitude.trim() ? parseFloat(longitude.trim()) : null;
      const parsedYear = establishedYear.trim() ? parseInt(establishedYear.trim(), 10) : null;

      const updatePayload: SocietyUpdatePayload = {
        name: name.trim(),
        type,
        registrationNumber: registrationNumber.trim() || null,
        establishedYear: parsedYear,
        description: description.trim() || null,
        status,
        imageUrl: finalImageUrl,
        address: {
          line1: line1.trim(),
          line2: line2.trim() || null,
          city: city.trim(),
          district: district.trim() || null,
          state: stateName.trim(),
          pinCode: pinCode.trim(),
        },
        location: {
          latitude: parsedLat,
          longitude: parsedLng,
          source: 'user-provided',
          dataStatus: 'illustrative',
        },
      };

      await updateSociety(society.id, updatePayload);

      const updatedSociety: Society = {
        ...society,
        ...updatePayload,
        address: {
          ...society.address,
          ...(updatePayload.address as any),
        },
        location: {
          ...society.location,
          ...(updatePayload.location as any),
        },
        imageUrl: finalImageUrl,
        updatedAt: new Date(),
      };

      onUpdated(updatedSociety);
      toast({
        variant: 'success',
        title: 'Society details updated',
        description: `Changes to ${updatedSociety.name} have been saved successfully.`,
      });
      onClose();
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Update failed',
        description: err instanceof Error ? err.message : 'Could not save society changes.',
      });
    } finally {
      setSaving(false);
      setUploadProgress(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !saving && !open && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-hidden p-0 sm:rounded-2xl border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="bg-slate-900 px-6 py-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400 ring-1 ring-cyan-500/40">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-white">
                  Edit Society Details
                </DialogTitle>
                <p className="text-xs text-slate-400">
                  Update registration information, address, coordinates, and branding.
                </p>
              </div>
            </div>
            <Badge variant="outline" className="border-slate-700 bg-slate-800 text-cyan-300 font-mono text-[11px]">
              ID: {society.id.slice(0, 8)}…
            </Badge>
          </div>

          {/* Navigation Tabs */}
          <div className="mt-5 flex gap-1 border-b border-slate-800 pb-0">
            <button
              type="button"
              onClick={() => setActiveTab('general')}
              className={`flex items-center gap-2 border-b-2 px-3.5 py-2 text-xs font-semibold transition-all ${
                activeTab === 'general'
                  ? 'border-cyan-400 text-cyan-400 bg-slate-800/60 rounded-t-lg'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30 rounded-t-lg'
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              General Info
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('address')}
              className={`flex items-center gap-2 border-b-2 px-3.5 py-2 text-xs font-semibold transition-all ${
                activeTab === 'address'
                  ? 'border-cyan-400 text-cyan-400 bg-slate-800/60 rounded-t-lg'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30 rounded-t-lg'
              }`}
            >
              <MapPin className="h-3.5 w-3.5" />
              Address
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('location')}
              className={`flex items-center gap-2 border-b-2 px-3.5 py-2 text-xs font-semibold transition-all ${
                activeTab === 'location'
                  ? 'border-cyan-400 text-cyan-400 bg-slate-800/60 rounded-t-lg'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30 rounded-t-lg'
              }`}
            >
              <Globe className="h-3.5 w-3.5" />
              GIS & Location
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('image')}
              className={`flex items-center gap-2 border-b-2 px-3.5 py-2 text-xs font-semibold transition-all ${
                activeTab === 'image'
                  ? 'border-cyan-400 text-cyan-400 bg-slate-800/60 rounded-t-lg'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30 rounded-t-lg'
              }`}
            >
              <ImageIcon className="h-3.5 w-3.5" />
              Cover Image
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col max-h-[calc(92vh-150px)]">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* TAB 1: GENERAL INFO */}
            {activeTab === 'general' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label htmlFor="edit-society-name" className="block text-xs font-bold text-slate-800 mb-1.5">
                      Society Name <span className="text-red-500">*</span>
                    </label>
                    <Input
                      id="edit-society-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. VTP Bhagyasthan"
                      className="border-slate-300 focus:border-cyan-500"
                    />
                    {errors.name && <p className="text-[11px] font-semibold text-red-600 mt-1">{errors.name}</p>}
                  </div>

                  <div>
                    <label htmlFor="edit-society-type" className="block text-xs font-bold text-slate-800 mb-1.5">
                      Society Type
                    </label>
                    <Select
                      id="edit-society-type"
                      value={type}
                      onChange={(e) => setType(e.target.value as SocietyType)}
                      className="border-slate-300 focus:border-cyan-500"
                    >
                      {SOCIETY_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div>
                    <label htmlFor="edit-society-status" className="block text-xs font-bold text-slate-800 mb-1.5">
                      Status
                    </label>
                    <Select
                      id="edit-society-status"
                      value={status}
                      onChange={(e) => setStatus(e.target.value as SocietyStatus)}
                      className="border-slate-300 focus:border-cyan-500"
                    >
                      <option value="active">Active (Operational)</option>
                      <option value="inactive">Inactive</option>
                      <option value="archived">Archived</option>
                    </Select>
                  </div>

                  <div>
                    <label htmlFor="edit-reg-no" className="block text-xs font-bold text-slate-800 mb-1.5">
                      Registration / Certificate Number
                    </label>
                    <Input
                      id="edit-reg-no"
                      value={registrationNumber}
                      onChange={(e) => setRegistrationNumber(e.target.value)}
                      placeholder="e.g. PS2100000316"
                      className="border-slate-300 focus:border-cyan-500 font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label htmlFor="edit-est-year" className="block text-xs font-bold text-slate-800 mb-1.5">
                      Established Year
                    </label>
                    <Input
                      id="edit-est-year"
                      type="number"
                      value={establishedYear}
                      onChange={(e) => setEstablishedYear(e.target.value)}
                      placeholder="e.g. 2017"
                      className="border-slate-300 focus:border-cyan-500 text-xs"
                    />
                    {errors.establishedYear && (
                      <p className="text-[11px] font-semibold text-red-600 mt-1">{errors.establishedYear}</p>
                    )}
                  </div>

                  <div className="sm:col-span-2">
                    <label htmlFor="edit-description" className="block text-xs font-bold text-slate-800 mb-1.5">
                      Society Description & Notes
                    </label>
                    <Textarea
                      id="edit-description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      placeholder="Brief description about the housing complex, amenities, or development phases..."
                      className="border-slate-300 focus:border-cyan-500 text-xs leading-relaxed"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: ADDRESS */}
            {activeTab === 'address' && (
              <div className="space-y-4">
                <div>
                  <label htmlFor="edit-line1" className="block text-xs font-bold text-slate-800 mb-1.5">
                    Address Line 1 (Street, Survey No., Landmark)
                  </label>
                  <Input
                    id="edit-line1"
                    value={line1}
                    onChange={(e) => setLine1(e.target.value)}
                    placeholder="e.g. Bhagyasthan, Sr No. 59/1+2, Talegaon - Chakan Hwy"
                    className="border-slate-300 focus:border-cyan-500 text-xs"
                  />
                </div>

                <div>
                  <label htmlFor="edit-line2" className="block text-xs font-bold text-slate-800 mb-1.5">
                    Address Line 2 (Area, Colony, Sector)
                  </label>
                  <Input
                    id="edit-line2"
                    value={line2}
                    onChange={(e) => setLine2(e.target.value)}
                    placeholder="e.g. Opp. UNIQUE HOSPITAL, Vidya Vihar Colony"
                    className="border-slate-300 focus:border-cyan-500 text-xs"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="edit-city" className="block text-xs font-bold text-slate-800 mb-1.5">
                      City / Taluka
                    </label>
                    <Input
                      id="edit-city"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Talegaon Dabhade"
                      className="border-slate-300 focus:border-cyan-500 text-xs"
                    />
                  </div>

                  <div>
                    <label htmlFor="edit-district" className="block text-xs font-bold text-slate-800 mb-1.5">
                      District
                    </label>
                    <Input
                      id="edit-district"
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      placeholder="e.g. Pune"
                      className="border-slate-300 focus:border-cyan-500 text-xs"
                    />
                  </div>

                  <div>
                    <label htmlFor="edit-state" className="block text-xs font-bold text-slate-800 mb-1.5">
                      State / UT
                    </label>
                    <Input
                      id="edit-state"
                      value={stateName}
                      onChange={(e) => setStateName(e.target.value)}
                      placeholder="e.g. Maharashtra"
                      className="border-slate-300 focus:border-cyan-500 text-xs"
                    />
                  </div>

                  <div>
                    <label htmlFor="edit-pincode" className="block text-xs font-bold text-slate-800 mb-1.5">
                      PIN Code (6 digits)
                    </label>
                    <Input
                      id="edit-pincode"
                      value={pinCode}
                      onChange={(e) => setPinCode(e.target.value)}
                      placeholder="e.g. 410507"
                      maxLength={6}
                      className="border-slate-300 focus:border-cyan-500 font-mono text-xs"
                    />
                    {errors.pinCode && <p className="text-[11px] font-semibold text-red-600 mt-1">{errors.pinCode}</p>}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: LOCATION */}
            {activeTab === 'location' && (
              <div className="space-y-4">
                <div className="rounded-xl border border-cyan-200 bg-cyan-50/70 p-4 text-cyan-900">
                  <div className="flex items-start gap-2.5">
                    <Info className="h-4 w-4 shrink-0 text-cyan-600 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold">Geographical Coordinates (WGS84)</h4>
                      <p className="text-[11px] text-cyan-800/90 leading-relaxed mt-0.5">
                        These coordinates position your society on the 2D Cadastral GIS Map and 3D Digital Twin environment.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="edit-latitude" className="block text-xs font-bold text-slate-800 mb-1.5">
                      Latitude (° N)
                    </label>
                    <Input
                      id="edit-latitude"
                      value={latitude}
                      onChange={(e) => setLatitude(e.target.value)}
                      placeholder="e.g. 18.730245"
                      className="border-slate-300 focus:border-cyan-500 font-mono text-xs"
                    />
                    {errors.latitude && <p className="text-[11px] font-semibold text-red-600 mt-1">{errors.latitude}</p>}
                  </div>

                  <div>
                    <label htmlFor="edit-longitude" className="block text-xs font-bold text-slate-800 mb-1.5">
                      Longitude (° E)
                    </label>
                    <Input
                      id="edit-longitude"
                      value={longitude}
                      onChange={(e) => setLongitude(e.target.value)}
                      placeholder="e.g. 73.684512"
                      className="border-slate-300 focus:border-cyan-500 font-mono text-xs"
                    />
                    {errors.longitude && <p className="text-[11px] font-semibold text-red-600 mt-1">{errors.longitude}</p>}
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleDetectLocation}
                    className="gap-2 border-slate-300 text-xs font-semibold hover:bg-slate-50"
                  >
                    <MapPin className="h-3.5 w-3.5 text-cyan-600" />
                    Detect Current GPS Coordinates
                  </Button>
                </div>
              </div>
            )}

            {/* TAB 4: IMAGE */}
            {activeTab === 'image' && (
              <div className="space-y-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/jpg"
                  className="hidden"
                  onChange={handleFileChange}
                />

                {previewUrl ? (
                  <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                    <SafeImage
                      src={previewUrl}
                      alt="Society cover preview"
                      className="aspect-[16/9] w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-slate-950/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-white/90 text-slate-900 hover:bg-white text-xs font-bold"
                      >
                        <Upload className="h-3.5 w-3.5 mr-1" /> Change Image
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={handleClearImage}
                        className="text-xs font-bold"
                      >
                        <X className="h-3.5 w-3.5 mr-1" /> Remove
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="flex aspect-[16/9] w-full cursor-pointer flex-col items-center justify-center gap-2.5 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/70 p-6 text-center transition-all hover:border-cyan-500 hover:bg-cyan-50/30"
                  >
                    <div className="rounded-full bg-white p-3 shadow-sm ring-1 ring-slate-200">
                      <Upload className="h-6 w-6 text-cyan-600" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">Click to upload society cover photo</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">JPEG, PNG, or WEBP up to 5 MB</p>
                    </div>
                  </div>
                )}

                {uploadProgress !== null && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-slate-600">
                      <span>Uploading image...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full bg-cyan-500 transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={saving}
              className="text-xs font-semibold"
            >
              Cancel
            </Button>
            <div className="flex items-center gap-2">
              <Button
                type="submit"
                disabled={saving}
                className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs gap-2 px-5 shadow-sm"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Saving Changes...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" /> Save Society Details
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
