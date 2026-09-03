'use client';

import React from 'react';
import Link from 'next/link';
import { Building, ShieldCheck, FileText, HelpCircle, Phone, Lock, Sparkles, MapPin } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-950 text-slate-400 border-t border-slate-800 text-sm mt-auto">
      {/* Top Banner: Digital Trust & Security */}
      <div className="border-b border-slate-800/80 bg-slate-900/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-white font-semibold text-xs uppercase tracking-wider">
                  ULPIN 14-Digit Standard
                </h4>
                <p className="text-xs text-slate-400">Bhu-Aadhaar geospatial parcel validation</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-white font-semibold text-xs uppercase tracking-wider">
                  Immutable Cryptographic Records
                </h4>
                <p className="text-xs text-slate-400">SHA-256 digital seals & RTK GPS coordinates</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-white font-semibold text-xs uppercase tracking-wider">
                  Smart India Hackathon 2024
                </h4>
                <p className="text-xs text-slate-400">Next-Gen Digital Governance & 3D Twin Cadastre</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Col 1: Platform Overview */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg overflow-hidden border border-cyan-500/40 bg-slate-950 flex items-center justify-center">
                <img src="/logo.jpeg" alt="CyberSpark BHU-VERIFY" className="w-full h-full object-cover" />
              </div>
              <span className="font-extrabold text-white text-base tracking-tight">
                CYBERSPARK · BHU-VERIFY
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed pr-6">
              A unified national geospatial cadastre and digital twin verification portal empowering citizens with transparent land records, 3D building exploration, automated fraud prevention, and rapid field demarcation.
            </p>
            <div className="flex items-center gap-3 text-xs text-slate-300 font-mono">
              <span className="px-2 py-1 rounded bg-slate-900 border border-slate-800">
                ISO 19152 LADM Compliant
              </span>
              <span className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-cyan-400">
                OGC WFS/WMS 3D
              </span>
            </div>
          </div>

          {/* Col 2: For Citizens */}
          <div>
            <h5 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Citizen Services</h5>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/properties" className="hover:text-cyan-300 transition-colors">
                  ULPIN Parcel Search
                </Link>
              </li>
              <li>
                <Link href="/properties/prop-blr-001" className="hover:text-cyan-300 transition-colors">
                  3D Digital Twin Viewer
                </Link>
              </li>
              <li>
                <Link href="/disputes/new" className="hover:text-cyan-300 transition-colors">
                  File Boundary Dispute
                </Link>
              </li>
              <li>
                <Link href="/field-verification/request" className="hover:text-cyan-300 transition-colors">
                  Book DGPS Field Survey
                </Link>
              </li>
              <li>
                <Link href="/dashboard/citizen" className="hover:text-cyan-300 transition-colors">
                  Citizen Property Vault
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: For Authorities */}
          <div>
            <h5 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Government Authorities</h5>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/dashboard/officer" className="hover:text-cyan-300 transition-colors">
                  Revenue Officer Portal
                </Link>
              </li>
              <li>
                <Link href="/dashboard/admin" className="hover:text-cyan-300 transition-colors">
                  Cadastral Administration
                </Link>
              </li>
              <li>
                <Link href="/disputes" className="hover:text-cyan-300 transition-colors">
                  Dispute Hearing Registry
                </Link>
              </li>
              <li>
                <Link href="/field-verification/request" className="hover:text-cyan-300 transition-colors">
                  Drone Demarcation Logs
                </Link>
              </li>
              <li>
                <Link href="/notifications" className="hover:text-cyan-300 transition-colors">
                  State Alerts Dispatch
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Support & Helplines */}
          <div>
            <h5 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Support & Legal</h5>
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center gap-2 text-cyan-400">
                <Phone className="w-3.5 h-3.5" />
                <span className="font-semibold">Toll Free: 1800-425-BHUMI</span>
              </div>
              <p className="text-[11px] text-slate-400">
                National Land Records Modernisation Programme (NLRMP) Helpdesk (Mon - Sat, 9 AM - 6 PM IST)
              </p>
              <div className="pt-2">
                <Link
                  href="/auth/login"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-semibold"
                >
                  <Lock className="w-3 h-3 text-cyan-400" />
                  Official Officer Login
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Credits */}
        <div className="mt-10 pt-6 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} Smart Property Verification Platform. Built with Midnight Tech Design System.</p>
          <div className="flex items-center gap-4">
            <span className="hover:text-slate-300 cursor-pointer">Privacy Policy</span>
            <span>•</span>
            <span className="hover:text-slate-300 cursor-pointer">Terms of Cadastre Service</span>
            <span>•</span>
            <span className="hover:text-slate-300 cursor-pointer">API Integration</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
