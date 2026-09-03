'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { PERMISSIONS } from '@/types/auth';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getAvailableSocieties } from '@/lib/society/service';
import { getAllVerifications } from '@/lib/society/governmentService';
import {
  type GovVerification,
  type GovVerificationStatus,
  type Society,
  GOV_VERIFICATION_STATUS_LABELS,
  GOV_VERIFICATION_STATUS_VARIANTS,
} from '@/types/society';
import {
  Building2,
  Search,
  Landmark,
  ArrowRight,
  RefreshCw,
  Eye,
  MapPin,
  Calendar,
  Layers,
  AlertTriangle,
} from 'lucide-react';

export default function GovernmentSocietiesDirectoryPage() {
  return (
    <ProtectedRoute permission={PERMISSIONS.VIEW_VERIFICATION_QUEUE}>
      <SocietiesDirectoryContent />
    </ProtectedRoute>
  );
}

function SocietiesDirectoryContent() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [societies, setSocieties] = useState<Society[]>([]);
  const [verifications, setVerifications] = useState<GovVerification[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [allSocieties, allVerifications] = await Promise.all([
        getAvailableSocieties(),
        getAllVerifications(),
      ]);
      setSocieties(allSocieties);
      setVerifications(allVerifications);
    } catch (err) {
      console.error('Failed to load societies directory:', err);
      setError(err instanceof Error ? err.message : 'Unable to load societies.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const societyVerificationsMap = useMemo(() => {
    const map = new Map<string, GovVerification>();
    verifications
      .filter((v) => v.targetType === 'society')
      .forEach((v) => {
        map.set(v.targetId, v);
      });
    return map;
  }, [verifications]);

  const filteredSocieties = useMemo(() => {
    return societies.filter((society) => {
      const ver = societyVerificationsMap.get(society.id);
      const currentStatus = ver ? ver.status : 'pending';

      const matchesStatus = statusFilter === 'all' || currentStatus === statusFilter;
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        society.name.toLowerCase().includes(q) ||
        (society.registrationNumber && society.registrationNumber.toLowerCase().includes(q)) ||
        society.address.city.toLowerCase().includes(q) ||
        (society.address.district && society.address.district.toLowerCase().includes(q)) ||
        society.address.state.toLowerCase().includes(q);

      return matchesStatus && matchesSearch;
    });
  }, [societies, societyVerificationsMap, searchQuery, statusFilter]);

  return (
    <PageContainer>
      <div className="space-y-6">
        <PageHeader
          eyebrow="OFFICIAL CADASTRE DIRECTORY"
          title="Registered Societies for Verification"
          description="Browse and inspect all housing societies, apartment complexes, and residential developments submitted for government cadastre verification."
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => void loadData()}
                disabled={loading}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
              </Button>
              <Link href="/government/dashboard">
                <Button variant="secondary" size="sm">
                  Dashboard
                </Button>
              </Link>
            </div>
          }
        />

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-800">
            <p className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
              {error}
            </p>
          </div>
        )}

        {/* Filters and search bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-tech">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by society name, registration no, city or district..."
              className="pl-9 text-xs"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
            {[
              { key: 'all', label: 'All Societies' },
              { key: 'pending', label: 'Pending' },
              { key: 'verified', label: 'Verified' },
              { key: 'flagged', label: 'Flagged' },
              { key: 'needs-review', label: 'Needs Review' },
              { key: 'rejected', label: 'Rejected' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`rounded-lg px-3 py-1.5 text-xs transition-colors ${
                  statusFilter === tab.key
                    ? 'bg-slate-900 font-bold text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Societies Grid / List */}
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400">
            <RefreshCw className="mx-auto mb-2 h-6 w-6 animate-spin text-cyan-600" />
            Loading societies from database…
          </div>
        ) : filteredSocieties.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-xs text-slate-500 shadow-tech">
            <Landmark className="mx-auto mb-2 h-10 w-10 text-slate-300" />
            <p className="text-sm font-bold text-slate-800">No societies found</p>
            <p className="mt-1 text-slate-400">
              {searchQuery
                ? 'Try adjusting your search terms or filters.'
                : 'No societies match the selected verification status.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredSocieties.map((society) => {
              const ver = societyVerificationsMap.get(society.id);
              const status: GovVerificationStatus = ver ? ver.status : 'pending';
              const badgeVariant = GOV_VERIFICATION_STATUS_VARIANTS[status];
              const badgeLabel = GOV_VERIFICATION_STATUS_LABELS[status];

              return (
                <div
                  key={society.id}
                  className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-tech hover:shadow-tech-lg transition-all"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="text-sm font-extrabold text-slate-900 truncate">
                          {society.name}
                        </h3>
                        <p className="text-[11px] font-medium text-slate-500">{society.type}</p>
                      </div>
                      <Badge variant={badgeVariant} className="text-[10px] shrink-0">
                        {badgeLabel}
                      </Badge>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-600 pt-1">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">
                          {society.address.city}, {society.address.state} — {society.address.pinCode}
                        </span>
                      </div>

                      {society.registrationNumber && (
                        <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-500">
                          <span className="font-semibold text-slate-700">Reg:</span>
                          <span>{society.registrationNumber}</span>
                        </div>
                      )}

                      {society.establishedYear && (
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                          <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span>Est: {society.establishedYear}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] font-mono text-slate-400">
                      ID: {society.id.slice(0, 8)}…
                    </span>
                    <Link href={`/government/societies/${society.id}`}>
                      <Button size="sm" variant="default" className="text-xs h-8 gap-1.5">
                        <Eye className="h-3.5 w-3.5" /> Inspect & Verify
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
