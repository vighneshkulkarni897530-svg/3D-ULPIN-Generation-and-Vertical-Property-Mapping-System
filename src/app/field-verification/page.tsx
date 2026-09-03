'use client';

import React from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import {
  ClipboardCheck,
  FileCheck2,
  MapPin,
  ShieldCheck,
  ArrowRight,
  Crosshair,
  Layers,
  CheckCircle2,
} from 'lucide-react';

export default function FieldVerificationHubPage() {
  return (
    <ProtectedRoute>
      <FieldVerificationHubContent />
    </ProtectedRoute>
  );
}

function FieldVerificationHubContent() {
  return (
    <PageContainer>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Cadastral Field Survey & Verification"
          title="Field Verification Command Hub"
          description="Initiate ground-truth spatial surveys, coordinate Total Station/Drone inspection requests, and manage on-site cadastral dossiers."
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild size="sm" className="bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold shadow-sm">
                <Link href="/field-verification/request">
                  <FileCheck2 className="mr-1.5 h-3.5 w-3.5" /> New Verification Request
                </Link>
              </Button>
            </div>
          }
        />

        {/* Action Cards */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {/* Card 1: Submit Field Request */}
          <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-cyan-400 hover:shadow-md">
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-100 bg-cyan-50 text-cyan-600">
                <FileCheck2 className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-base font-extrabold text-slate-900">Request Field Verification</h3>
              <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
                Submit an official request for on-site Total Station survey, LiDAR drone scanning, or boundary encroachment checks.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100">
              <Button asChild className="w-full bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold">
                <Link href="/field-verification/request">
                  Open Request Form <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </div>

          {/* Card 2: Officer Field Queue */}
          <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-cyan-400 hover:shadow-md">
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-100 bg-emerald-50 text-emerald-600">
                <ClipboardCheck className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-base font-extrabold text-slate-900">Field Survey Queue</h3>
              <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
                Review assigned field verification tasks, inspect coordinate discrepancies, and upload on-site survey certificates.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100">
              <Button asChild variant="outline" className="w-full border-slate-300 text-slate-700 hover:border-emerald-500 hover:text-emerald-700 text-xs font-bold">
                <Link href="/verification/field">
                  View Field Queue <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </div>

          {/* Card 3: Central Verification Center */}
          <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-cyan-400 hover:shadow-md">
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-600">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-base font-extrabold text-slate-900">Cadastral Verification Centre</h3>
              <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
                Access full system verifications, ULPIN certification pipeline, and vertical property validation records.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100">
              <Button asChild variant="outline" className="w-full border-slate-300 text-slate-700 hover:border-blue-500 hover:text-blue-700 text-xs font-bold">
                <Link href="/verification">
                  Open Verification Centre <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Informational Guidance */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700 shrink-0">
              <Crosshair className="h-4 w-4" />
            </div>
            <div>
              <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                Cadastral Survey Standards &amp; ULPIN Protocol
              </h4>
              <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                All field demarcations are performed according to National Cadastral Survey Guidelines (WGS 84 / UTM Zone 43N).
                Completed field surveys automatically feed into the 3D ULPIN vertical polygon generation engine.
              </p>
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
