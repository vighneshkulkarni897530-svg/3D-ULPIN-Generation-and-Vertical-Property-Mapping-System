import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { PropertyProvider } from '@/context/PropertyContext';
import { GISProvider } from '@/context/GISContext';
import { WorkflowProvider } from '@/context/WorkflowContext';
import { AppShell } from '@/components/layout/AppShell';
import { Toaster } from '@/components/ui/toaster';

export const metadata: Metadata = {
  title: 'Smart Property Verification Platform | 3D Cadastre & ULPIN Verification',
  description: 'National Digital Cadastre Platform for transparent land verification, 3D building digital twins, and citizen dispute resolution.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-slate-50 text-slate-900 antialiased selection:bg-cyan-500 selection:text-slate-950">
        <AuthProvider>
          <PropertyProvider>
            <GISProvider>
              <WorkflowProvider>
                <AppShell>{children}</AppShell>
                <Toaster />
              </WorkflowProvider>
            </GISProvider>
          </PropertyProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
