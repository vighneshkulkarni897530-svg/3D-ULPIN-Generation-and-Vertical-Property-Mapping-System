'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Loader2 } from 'lucide-react';

export default function ResidentIndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/resident/dashboard');
  }, [router]);

  return (
    <ProtectedRoute>
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin text-cyan-600" /> Redirecting to Resident Dashboard...
        </div>
      </div>
    </ProtectedRoute>
  );
}
