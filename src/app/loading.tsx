import { Loader2 } from 'lucide-react';

export default function RootLoading() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-8 text-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-600" />
        <p className="font-mono text-xs font-bold text-slate-500 uppercase tracking-widest">
          Loading Cadastral Platform…
        </p>
      </div>
    </div>
  );
}
