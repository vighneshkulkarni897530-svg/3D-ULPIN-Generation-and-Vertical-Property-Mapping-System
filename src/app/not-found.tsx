import Link from 'next/link';
import { FileQuestion, Home, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function RootNotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center p-6 text-center">
      <div className="mx-auto max-w-md space-y-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-md">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-cyan-600 border border-slate-200">
          <FileQuestion className="h-8 w-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-black text-slate-900">404 — Page Not Found</h1>
          <p className="text-xs text-slate-600 leading-relaxed">
            The requested cadastral registry route, building resource, or verification dossier could not be located.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Button asChild className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs">
            <Link href="/dashboard">
              <Home className="mr-1.5 h-3.5 w-3.5" /> Return to Dashboard
            </Link>
          </Button>
          <Button asChild variant="outline" className="text-xs font-bold border-slate-300">
            <Link href="/map">
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Open 2D/3D Map
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
