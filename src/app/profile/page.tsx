'use client';

/**
 * /profile
 * --------
 * User account overview and editing:
 * - Identity card with real-time Profile Photo upload & preview
 * - Edit Profile modal with role-specific fields
 * - Immediate synchronization to AuthContext & server database
 * - Centralized permissions & active session monitoring
 */
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  User, Mail, Phone, Fingerprint, Calendar, Building, BadgeCheck, ShieldCheck,
  Clock, Ban, KeyRound, LogOut, LogIn, Loader2, Edit3, Camera, UploadCloud,
  CheckCircle2, AlertCircle, X, Sparkles
} from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { useAuth } from '@/context/AuthContext';
import { ROLE_LABELS, PERMISSION_MATRIX } from '@/lib/auth/permissions';
import { apiLogout } from '@/lib/auth/client';

export default function ProfilePage() {
  const { sessionUser, currentUser, role, authStatus, sessionExpiresAt, logout, updateProfile } = useAuth();
  const router = useRouter();
  const user = sessionUser ?? currentUser;
  const [loggingOut, setLoggingOut] = useState(false);

  // Edit Profile Modal state
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');
  const [editPhone, setEditPhone] = useState(user?.phone || '');
  const [editAadhaar, setEditAadhaar] = useState(user?.aadhaarOrGovId || '');
  const [editDepartment, setEditDepartment] = useState(user?.department || '');
  const [editDesignation, setEditDesignation] = useState(user?.designation || '');
  const [editJurisdiction, setEditJurisdiction] = useState(user?.jurisdictionDistrict || '');
  const [editSocietyName, setEditSocietyName] = useState(user?.societyName || '');
  const [editSocietyRegNo, setEditSocietyRegNo] = useState(user?.societyRegNo || '');
  const [editAvatarUrl, setEditAvatarUrl] = useState(user?.avatarUrl || '');

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Update edit form values when user changes
  useEffect(() => {
    if (user) {
      setEditName(user.name || '');
      setEditPhone(user.phone || '');
      setEditAadhaar(user.aadhaarOrGovId || '');
      setEditDepartment(user.department || '');
      setEditDesignation(user.designation || '');
      setEditJurisdiction(user.jurisdictionDistrict || '');
      setEditSocietyName(user.societyName || '');
      setEditSocietyRegNo(user.societyRegNo || '');
      setEditAvatarUrl(user.avatarUrl || '');
    }
  }, [user]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await apiLogout();
      await logout();
      router.push('/auth/login');
    } finally {
      setLoggingOut(false);
    }
  };

  // Profile photo file selection
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setSaveError('Please select a valid image file (PNG, JPG, WEBP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setSaveError('Image file size should be less than 5MB.');
      return;
    }

    setSaveError(null);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      setEditAvatarUrl(dataUrl);

      // If user uploads directly from the card (not inside the modal), save immediately!
      if (!isEditing) {
        setSaving(true);
        const res = await updateProfile({ avatarUrl: dataUrl });
        setSaving(false);
        if (res.ok) {
          setSaveSuccess(true);
          setTimeout(() => setSaveSuccess(false), 3000);
        } else {
          setSaveError(res.error || 'Failed to update profile photo.');
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);

    const patch: Record<string, any> = {
      name: editName.trim(),
      phone: editPhone.trim(),
      aadhaarOrGovId: editAadhaar.trim(),
      avatarUrl: editAvatarUrl || undefined,
    };

    if (role === 'OFFICER') {
      patch.department = editDepartment.trim();
      patch.designation = editDesignation.trim();
      patch.jurisdictionDistrict = editJurisdiction.trim();
    } else if (role === 'ADMIN') {
      patch.societyName = editSocietyName.trim();
      patch.societyRegNo = editSocietyRegNo.trim().toUpperCase();
      patch.jurisdictionDistrict = editJurisdiction.trim();
    }

    const res = await updateProfile(patch);
    setSaving(false);

    if (!res.ok) {
      setSaveError(res.error || 'Failed to save changes.');
      return;
    }

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 4000);
    setIsEditing(false);
  };

  if (authStatus === 'initializing') {
    return (
      <PageContainer>
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin text-cyan-600" />
          <p className="text-xs font-bold uppercase tracking-widest">Checking your session…</p>
        </div>
      </PageContainer>
    );
  }

  if (!sessionUser) {
    return (
      <PageContainer>
        <div className="mx-auto max-w-md py-12 text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
            <User className="h-7 w-7 text-slate-400" />
          </div>
          <h1 className="text-lg font-extrabold text-slate-900">You are signed out</h1>
          <p className="text-xs text-slate-500">Sign in to view your profile and account information.</p>
          <Link
            href="/auth/login?next=%2Fprofile"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-xs font-bold text-slate-950 shadow-tech-cyan"
          >
            <LogIn className="h-3.5 w-3.5" /> Sign in
          </Link>
        </div>
      </PageContainer>
    );
  }

  const isActive = user.accountStatus !== 'DISABLED';
  const initials = user.name
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const infoRows: { icon: React.ComponentType<{ className?: string }>; label: string; value: React.ReactNode }[] = [
    { icon: Mail, label: 'Email', value: user.email },
    { icon: Phone, label: 'Phone', value: user.phone || '—' },
    { icon: Fingerprint, label: 'Aadhaar / Govt ID', value: user.aadhaarOrGovId || '—' },
    ...(user.societyName ? [{ icon: Building, label: 'Housing Society', value: user.societyName }] : []),
    ...(user.societyRegNo ? [{ icon: BadgeCheck, label: 'Society Reg. No.', value: user.societyRegNo }] : []),
    ...(user.department ? [{ icon: Building, label: 'Department', value: user.department }] : []),
    ...(user.designation ? [{ icon: BadgeCheck, label: 'Designation', value: user.designation }] : []),
    ...(user.badgeNumber ? [{ icon: KeyRound, label: 'Badge / Service No.', value: user.badgeNumber }] : []),
    ...(user.jurisdictionDistrict ? [{ icon: Building, label: 'Jurisdiction', value: user.jurisdictionDistrict }] : []),
    { icon: Calendar, label: 'Account created', value: user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—' },
  ];

  return (
    <PageContainer>
      <div className="space-y-6">
        <PageHeader
          eyebrow="ACCOUNT SETTINGS"
          title="My Profile & Credentials"
          description="Manage your verified identity, official role credentials, profile photo, and authorization permissions."
          actions={
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-4 py-2 text-xs shadow-tech-cyan transition-all"
              >
                <Edit3 className="h-3.5 w-3.5" />
                Edit Profile
              </button>
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition-colors hover:border-red-400 hover:text-red-600 disabled:opacity-60"
              >
                {loggingOut ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5" />}
                Sign out
              </button>
            </div>
          }
        />

        {saveSuccess && (
          <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-3.5 text-xs font-bold text-emerald-800">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>Profile successfully updated! Changes are reflected across all portals and badges.</span>
          </div>
        )}

        {saveError && (
          <div className="flex items-center gap-2 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-3.5 text-xs font-bold text-rose-800">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{saveError}</span>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Identity card */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-1 space-y-5">
            <div className="flex items-center gap-4">
              {/* Photo Avatar with 1-click change overlay */}
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border-2 border-cyan-500/50 bg-slate-900 shadow-md group">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-cyan-500 to-blue-600 text-sm font-extrabold text-slate-950">
                    {initials}
                  </div>
                )}
                <input
                  id="direct-photo-upload"
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                <label
                  htmlFor="direct-photo-upload"
                  className="absolute inset-0 flex cursor-pointer items-center justify-center bg-slate-950/60 opacity-0 transition-opacity group-hover:opacity-100 text-white"
                  title="Upload / Change Photo"
                >
                  <Camera className="h-5 w-5" />
                </label>
              </div>

              <div className="min-w-0">
                <h2 className="truncate text-base font-extrabold tracking-tight text-slate-900">{user.name}</h2>
                <p className="truncate text-xs text-slate-500">{user.email}</p>
                <label
                  htmlFor="direct-photo-upload"
                  className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-cyan-600 hover:text-cyan-700 cursor-pointer hover:underline"
                >
                  <Camera className="h-3 w-3" /> Change Photo
                </label>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-[10px] font-bold text-cyan-700">
                <ShieldCheck className="h-3 w-3" /> {ROLE_LABELS[role]}
              </span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold ${
                  isActive ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'
                }`}
              >
                {isActive ? <BadgeCheck className="h-3 w-3" /> : <Ban className="h-3 w-3" />}
                {isActive ? 'Active' : 'Disabled'}
              </span>
            </div>

            <div className="space-y-2.5 border-t border-slate-100 pt-4">
              {infoRows.map((row) => (
                <div key={row.label} className="flex items-start gap-2.5">
                  <row.icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{row.label}</p>
                    <p className="truncate text-xs font-semibold text-slate-700">{row.value}</p>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setIsEditing(true)}
              className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 py-2.5 text-xs font-bold text-slate-700 transition-colors"
            >
              <Edit3 className="h-3.5 w-3.5 text-cyan-600" /> Edit Profile Details
            </button>
          </div>

          <div className="space-y-6 lg:col-span-2">
            {/* Session card */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="flex items-center gap-2 text-sm font-extrabold tracking-tight text-slate-900">
                <Clock className="h-4 w-4 text-cyan-600" /> Session Standing
              </h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Status</p>
                  <p className="text-xs font-bold text-emerald-700">Signed in · active session</p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Expires</p>
                  <p className="text-xs font-bold text-slate-700">
                    {sessionExpiresAt ? new Date(sessionExpiresAt).toLocaleString() : '—'}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
                Managed via authenticated session cookie with automatic synchronization. Role-based actions are verified server-side.
              </p>
            </div>

            {/* Permission matrix card */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="flex items-center gap-2 text-sm font-extrabold tracking-tight text-slate-900">
                <ShieldCheck className="h-4 w-4 text-cyan-600" /> Role Permissions
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Centralized permission matrix — enforced server-side at the API boundary.
              </p>
              <div className="mt-4 overflow-hidden rounded-xl border border-slate-100">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      <th className="px-3 py-2">Feature</th>
                      <th className="px-3 py-2 text-center">Citizen</th>
                      <th className="px-3 py-2 text-center">Officer</th>
                      <th className="px-3 py-2 text-center">Society Secretary</th>
                      <th className="px-3 py-2 text-center">You</th>
                    </tr>
                  </thead>
                  <tbody>
                    {PERMISSION_MATRIX.map((row) => {
                      const mine = role === 'CITIZEN' ? row.citizen : role === 'OFFICER' ? row.officer : row.admin;
                      return (
                        <tr key={row.feature} className="border-b border-slate-50 last:border-0">
                          <td className="px-3 py-2 font-semibold text-slate-700">{row.feature}</td>
                          {[row.citizen, row.officer, row.admin].map((allowed, i) => (
                            <td key={i} className="px-3 py-2 text-center">
                              {allowed ? <span className="text-emerald-600 font-bold">✓</span> : <span className="text-slate-300">✗</span>}
                            </td>
                          ))}
                          <td className="px-3 py-2 text-center">
                            {mine ? <span className="font-bold text-cyan-700">✓</span> : <span className="font-bold text-red-400">✗</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* EDIT PROFILE MODAL */}
        {isEditing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-xl rounded-3xl border border-slate-800 bg-slate-900 p-6 sm:p-7 shadow-2xl text-slate-100 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                    <Edit3 className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Edit Profile Details</h3>
                    <p className="text-xs text-slate-400">Update contact, credentials, and profile image</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSaveProfile} className="mt-5 space-y-4">
                {/* Photo Upload inside Modal */}
                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Profile Photo
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="relative h-16 w-16 shrink-0 rounded-2xl overflow-hidden border-2 border-cyan-500/50 bg-slate-900 flex items-center justify-center shadow-inner">
                      {editAvatarUrl ? (
                        <img src={editAvatarUrl} alt="Preview" className="h-full w-full object-cover" />
                      ) : (
                        <User className="h-8 w-8 text-slate-500" />
                      )}
                    </div>
                    <div className="flex-1">
                      <input
                        id="modal-photo-upload"
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                      <label
                        htmlFor="modal-photo-upload"
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-200 hover:bg-slate-700 hover:text-white cursor-pointer transition-colors"
                      >
                        <UploadCloud className="h-3.5 w-3.5 text-cyan-400" />
                        {editAvatarUrl ? 'Replace Photo' : 'Upload Photo'}
                      </label>
                      <p className="mt-1 text-[10px] text-slate-500">
                        PNG, JPG, or WEBP up to 5MB. Propagates to navbar, sidebar, and headers.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Name and Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-white outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                      Contact Phone
                    </label>
                    <input
                      type="tel"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-white outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                {/* Aadhaar / Govt ID */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Aadhaar / Bhu-Aadhaar ID
                  </label>
                  <input
                    type="text"
                    value={editAadhaar}
                    onChange={(e) => setEditAadhaar(e.target.value)}
                    placeholder="e.g. 5489-2918-9120"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-white outline-none focus:border-cyan-400"
                  />
                </div>

                {/* Role-specific fields */}
                {role === 'OFFICER' && (
                  <div className="space-y-3 rounded-2xl border border-emerald-500/20 bg-emerald-950/10 p-3.5">
                    <p className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                      Revenue Officer Credentials
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-300 uppercase mb-1">Department</label>
                        <input
                          type="text"
                          value={editDepartment}
                          onChange={(e) => setEditDepartment(e.target.value)}
                          className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-emerald-400"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-300 uppercase mb-1">Designation</label>
                        <input
                          type="text"
                          value={editDesignation}
                          onChange={(e) => setEditDesignation(e.target.value)}
                          className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-emerald-400"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-300 uppercase mb-1">Jurisdiction District</label>
                      <input
                        type="text"
                        value={editJurisdiction}
                        onChange={(e) => setEditJurisdiction(e.target.value)}
                        className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-emerald-400"
                      />
                    </div>
                  </div>
                )}

                {role === 'ADMIN' && (
                  <div className="space-y-3 rounded-2xl border border-indigo-500/20 bg-indigo-950/10 p-3.5">
                    <p className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">
                      Society Secretary Credentials
                    </p>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-300 uppercase mb-1">Housing Society Name</label>
                      <input
                        type="text"
                        value={editSocietyName}
                        onChange={(e) => setEditSocietyName(e.target.value)}
                        className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-indigo-400"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-300 uppercase mb-1">Society Reg. No.</label>
                        <input
                          type="text"
                          value={editSocietyRegNo}
                          onChange={(e) => setEditSocietyRegNo(e.target.value)}
                          className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-mono text-white outline-none focus:border-indigo-400"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-300 uppercase mb-1">Division / Jurisdiction</label>
                        <input
                          type="text"
                          value={editJurisdiction}
                          onChange={(e) => setEditJurisdiction(e.target.value)}
                          className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-indigo-400"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-3 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 rounded-xl border border-slate-800 hover:bg-slate-800 text-xs font-bold text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold text-xs shadow-tech-cyan hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5" /> Save Changes
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
