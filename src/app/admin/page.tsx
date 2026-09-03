'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Users, History, Settings, ArrowRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function AdminIndexPage() {
  const router = useRouter();
  const { role, isAuthenticated, authStatus } = useAuth();

  useEffect(() => {
    if (authStatus === 'initializing') return;
    if (isAuthenticated && ((role as string) === 'ADMIN' || (role as string) === 'SUPER_ADMIN')) {
      router.replace('/dashboard/admin');
    }
  }, [authStatus, isAuthenticated, role, router]);

  return (
    <ProtectedRoute>
      <PageContainer>
        <div className="space-y-6">
          <PageHeader
            eyebrow="System Administration"
            title="Administration &amp; Cadastre Portal"
            description="Manage users, access permissions, audit logs, and global cadastral system parameters."
          />

          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-600">
                  <Users className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-base font-extrabold text-slate-900">User Management</h3>
                <p className="mt-1 text-xs text-slate-500">Manage cadastral officers, society admins, and registered citizens.</p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100">
                <Button asChild className="w-full bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold">
                  <Link href="/admin/users">Manage Users <ArrowRight className="ml-1.5 h-3.5 w-3.5" /></Link>
                </Button>
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                  <History className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-base font-extrabold text-slate-900">Audit &amp; Security Logs</h3>
                <p className="mt-1 text-xs text-slate-500">Inspect system access, security audit trails, and mutation history.</p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100">
                <Button asChild variant="outline" className="w-full border-slate-300 text-slate-700 text-xs font-bold">
                  <Link href="/admin/audit-log">View Audit Trail <ArrowRight className="ml-1.5 h-3.5 w-3.5" /></Link>
                </Button>
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                  <Settings className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-base font-extrabold text-slate-900">System Settings</h3>
                <p className="mt-1 text-xs text-slate-500">Configure global platform parameters, GIS projection defaults, and rules.</p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100">
                <Button asChild variant="outline" className="w-full border-slate-300 text-slate-700 text-xs font-bold">
                  <Link href="/settings">Configure Settings <ArrowRight className="ml-1.5 h-3.5 w-3.5" /></Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </PageContainer>
    </ProtectedRoute>
  );
}
