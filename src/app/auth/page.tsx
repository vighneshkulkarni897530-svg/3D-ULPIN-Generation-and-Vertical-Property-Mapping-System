'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function AuthIndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/auth/login');
  }, [router]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin text-cyan-600" /> Redirecting to Authentication...
      </div>
    </div>
  );
}
