import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { PropertyProvider } from '@/context/PropertyContext';
import { GISProvider } from '@/context/GISContext';
import { WorkflowProvider } from '@/context/WorkflowContext';
import { RenewalProvider } from '@/context/RenewalContext';
import { AppShell } from '@/components/layout/AppShell';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClient } from '@/components/common/FirebaseClient';

export const metadata: Metadata = {
  title: 'Smart Property Verification Platform | 3D Cadastre & ULPIN Verification',
  description: 'National Digital Cadastre Platform for transparent land verification, 3D building digital twins, and citizen dispute resolution.',
  icons: {
    icon: '/logo.jpeg',
    shortcut: '/logo.jpeg',
    apple: '/logo.jpeg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/logo.jpeg" type="image/jpeg" />
        <link rel="shortcut icon" href="/logo.jpeg" type="image/jpeg" />
        <link rel="apple-touch-icon" href="/logo.jpeg" />
      </head>
      <body
        className="min-h-screen flex flex-col bg-slate-50 text-slate-900 antialiased selection:bg-cyan-500 selection:text-slate-950"
        suppressHydrationWarning
      >
        <AuthProvider>
          <PropertyProvider>
            <GISProvider>
              <WorkflowProvider>
                <RenewalProvider>
                  <FirebaseClient />
                  <AppShell>{children}</AppShell>
                  <Toaster />
                </RenewalProvider>
              </WorkflowProvider>
            </GISProvider>
          </PropertyProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
