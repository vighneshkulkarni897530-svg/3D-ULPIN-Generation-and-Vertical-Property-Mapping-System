'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getAvailableSocieties } from '@/lib/society/service';
import type { Society } from '@/types/society';
import {
  Building2,
  Search,
  Landmark,
  ArrowRight,
  RefreshCw,
  MapPin,
  Calendar,
  PlusCircle,
} from 'lucide-react';

export default function SocietyHubPage() {
  return (
    <ProtectedRoute>
      <SocietyHubContent />
    </ProtectedRoute>
  );
}

function SocietyHubContent() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [societies, setSocieties] = useState<Society[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const allSocieties = await getAvailableSocieties();
      setSocieties(allSocieties);
    } catch (err) {
      console.error('Failed to load societies:', err);
      setError('Unable to load societies registry. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredSocieties = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return societies;
    return societies.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.address.city.toLowerCase().includes(q) ||
        s.address.state.toLowerCase().includes(q) ||
        s.registrationNumber?.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q)
    );
  }, [societies, searchQuery]);

  return (
    <PageContainer>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Cadastral Society Portal"
          title="Society &amp; Township Directory"
          description="Manage registered cooperative societies, view 3D vertical boundaries, or register a new residential society."
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadData}
                disabled={loading}
                className="border-slate-300 bg-white text-xs font-bold text-slate-700"
              >
                <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
              </Button>
              <Button asChild size="sm" className="bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold shadow-sm">
                <Link href="/society/register">
                  <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> Register New Society
                </Link>
              </Button>
            </div>
          }
        />

        {/* Search Bar */}
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              type="text"
              placeholder="Search by society name, city, registration number, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs border-slate-200 focus-visible:ring-cyan-500"
            />
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Landmark className="h-4 w-4 text-cyan-600" />
            <span>
              Total Societies: <strong className="text-slate-900">{societies.length}</strong>
            </span>
          </div>
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-48 animate-pulse rounded-2xl border border-slate-200 bg-slate-50 p-5" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-xs text-rose-700">
            <p className="font-bold">{error}</p>
            <Button size="sm" onClick={loadData} className="mt-3 bg-rose-600 hover:bg-rose-700 text-white font-bold">
              Try Again
            </Button>
          </div>
        ) : filteredSocieties.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <Building2 className="mx-auto h-12 w-12 text-slate-300" />
            <h3 className="mt-4 text-sm font-bold text-slate-800">No Societies Found</h3>
            <p className="mt-1 text-xs text-slate-500">
              {searchQuery ? 'No societies match your search query.' : 'No registered societies currently in the directory.'}
            </p>
            <Button asChild size="sm" className="mt-4 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold">
              <Link href="/society/register">
                <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> Register Society Now
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredSocieties.map((soc) => (
              <div
                key={soc.id}
                className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-cyan-400 hover:shadow-md"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-600">
                        {soc.id}
                      </span>
                      <h3 className="mt-0.5 text-base font-extrabold text-slate-900 group-hover:text-cyan-700 transition-colors">
                        {soc.name}
                      </h3>
                    </div>
                    <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                      {soc.status ?? 'ACTIVE'}
                    </Badge>
                  </div>

                  <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-600">
                    <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">
                      {soc.address.city}, {soc.address.state} {soc.address.pinCode ? `— ${soc.address.pinCode}` : ''}
                    </span>
                  </div>

                  {soc.description && (
                    <p className="mt-2 line-clamp-2 text-xs text-slate-500 leading-relaxed">
                      {soc.description}
                    </p>
                  )}
                </div>

                <div className="mt-5 border-t border-slate-100 pt-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
                    <Calendar className="h-3 w-3" />
                    <span>Reg: {soc.registrationNumber ?? 'Verified'}</span>
                  </div>
                  <Button asChild size="sm" variant="ghost" className="h-8 px-2 text-xs font-bold text-cyan-700 hover:bg-cyan-50 hover:text-cyan-800">
                    <Link href={`/society/${soc.id}`}>
                      View Dashboard <ArrowRight className="ml-1 h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
