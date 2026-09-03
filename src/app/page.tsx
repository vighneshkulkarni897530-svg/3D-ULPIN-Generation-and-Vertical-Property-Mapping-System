'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { SearchBar } from '@/components/common/SearchBar';
import { 
  Building, 
  Layers, 
  MapPin, 
  ShieldCheck, 
  AlertCircle, 
  FileCheck2, 
  ArrowRight, 
  Sparkles, 
  CheckCircle2, 
  Lock, 
  BarChart3, 
  Globe2, 
  Compass, 
  Users, 
  Database,
  Award,
  ChevronRight
} from 'lucide-react';
import { useProperty } from '@/context/PropertyContext';
import { PropertyCard } from '@/components/property/PropertyCard';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.55, ease: 'easeOut' as const },
  }),
};

export default function LandingPage() {
  const { properties } = useProperty();
  const featuredProperties = properties.slice(0, 3);

  return (
    <div className="flex-1 flex flex-col">
      {/* 1. HERO SECTION (Midnight Dark Navy with Cyan Tech Highlights) */}
      <section className="relative bg-slate-950 text-white overflow-hidden pt-12 pb-24 border-b border-slate-800">
        {/* Subtle Background Glows & Grid Pattern */}
        <div className="absolute inset-0 tech-grid-dark opacity-40 pointer-events-none" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-cyan-500/15 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute top-1/3 right-10 w-[400px] h-[300px] bg-blue-600/10 blur-[100px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            className="text-center max-w-4xl mx-auto space-y-6"
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.1 } } }}
          >
            {/* Top Pill */}
            <motion.div variants={fadeUp} custom={0} className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-cyan-500/30 text-cyan-300 text-xs font-semibold shadow-tech-cyan">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>National Unified Geospatial Cadastre Platform</span>
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            </motion.div>

            {/* Headline */}
            <motion.h1 variants={fadeUp} custom={1} className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.15] text-slate-50">
              Transparent, Smart & Verified{' '}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-500">
                Land & Property Cadastre
              </span>
            </motion.h1>

            {/* Sub-headline */}
            <motion.p variants={fadeUp} custom={2} className="text-sm sm:text-base lg:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
              Verify land ownership using 14-digit <strong className="text-cyan-300 font-semibold">ULPIN (Bhu-Aadhaar)</strong>, inspect high-precision 2D boundary polygons, explore interactive 3D building digital twins, and resolve property disputes with official revenue officers.
            </motion.p>

            {/* Search Box Console */}
            <motion.div variants={fadeUp} custom={3} className="pt-4 max-w-3xl mx-auto">
              <SearchBar size="large" />
            </motion.div>

            {/* Micro Stats Bar */}
            <motion.div variants={fadeUp} custom={4} className="pt-8 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto text-left">
              <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-2xl">
                <span className="text-slate-400 text-xs font-medium">Verified Parcels</span>
                <p className="text-xl sm:text-2xl font-bold text-white font-mono mt-0.5">9.42M+</p>
                <span className="text-[10px] text-emerald-400 font-semibold">↑ 100% Geo-Referenced</span>
              </div>
              <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-2xl">
                <span className="text-slate-400 text-xs font-medium">3D Digital Twins</span>
                <p className="text-xl sm:text-2xl font-bold text-cyan-400 font-mono mt-0.5">385K+</p>
                <span className="text-[10px] text-slate-400">Highrise & Commercial</span>
              </div>
              <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-2xl">
                <span className="text-slate-400 text-xs font-medium">Dispute Turnaround</span>
                <p className="text-xl sm:text-2xl font-bold text-emerald-400 font-mono mt-0.5">4.2 Days</p>
                <span className="text-[10px] text-slate-400">DGPS Field Demarcation</span>
              </div>
              <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-2xl">
                <span className="text-slate-400 text-xs font-medium">Officer Network</span>
                <p className="text-xl sm:text-2xl font-bold text-sky-400 font-mono mt-0.5">14,200+</p>
                <span className="text-[10px] text-slate-400">State Cadastral Reg.</span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* 2. CORE PLATFORM CAPABILITIES */}
      <section className="py-20 bg-slate-900 text-white relative border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest">
              ENTERPRISE CADASTRE ARCHITECTURE
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              Next-Generation Digital Governance & Spatial Verification
            </h2>
            <p className="text-sm text-slate-400">
              Built on national GIS standards to ensure complete transparency, eliminate encroachment, and empower citizens with immutable land records.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1: ULPIN Integration */}
            <div className="p-6 bg-slate-950 border border-slate-800 hover:border-cyan-500/50 rounded-2xl space-y-4 group transition-all duration-300 shadow-lg hover:shadow-tech-cyan">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-cyan-300 transition-colors">
                14-Digit ULPIN Standard
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Unique Land Parcel Identification Number (Bhu-Aadhaar) generated via longitude/latitude vertex centroids for unambiguous geospatial identification.
              </p>
            </div>

            {/* Feature 2: 3D Digital Twin */}
            <div className="p-6 bg-slate-950 border border-slate-800 hover:border-cyan-500/50 rounded-2xl space-y-4 group transition-all duration-300 shadow-lg hover:shadow-tech-cyan">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-cyan-300 transition-colors">
                3D Building & Floor Twin
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Explore multi-tier 3D models with floor explosion sliders, unit raycasting, carpet area breakdown, and verified occupant KYC.
              </p>
            </div>

            {/* Feature 3: 2D GIS Cadastral Map */}
            <div className="p-6 bg-slate-950 border border-slate-800 hover:border-cyan-500/50 rounded-2xl space-y-4 group transition-all duration-300 shadow-lg hover:shadow-tech-cyan">
              <div className="w-12 h-12 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 group-hover:scale-110 transition-transform">
                <Compass className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-cyan-300 transition-colors">
                Interactive 2D GIS Parcels
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                View high-accuracy survey boundaries, adjacent parcel relationships, DGPS corner stone markers, and buffer setbacks.
              </p>
            </div>

            {/* Feature 4: Dispute Redressal */}
            <div className="p-6 bg-slate-950 border border-slate-800 hover:border-cyan-500/50 rounded-2xl space-y-4 group transition-all duration-300 shadow-lg hover:shadow-tech-cyan">
              <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 group-hover:scale-110 transition-transform">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-cyan-300 transition-colors">
                Instant Dispute Redressal
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                File boundary mismatch or title overlap complaints with multi-file evidence upload (photos, DGPS maps) and track case hearings online.
              </p>
            </div>

            {/* Feature 5: Field Demarcation */}
            <div className="p-6 bg-slate-950 border border-slate-800 hover:border-cyan-500/50 rounded-2xl space-y-4 group transition-all duration-300 shadow-lg hover:shadow-tech-cyan">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                <FileCheck2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-cyan-300 transition-colors">
                Field Survey & Drone Scan
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Request physical Total-Station demarcation or municipal drone aerial LiDAR scanning directly with assigned revenue inspectors.
              </p>
            </div>

            {/* Feature 6: Cryptographic Verification */}
            <div className="p-6 bg-slate-950 border border-slate-800 hover:border-cyan-500/50 rounded-2xl space-y-4 group transition-all duration-300 shadow-lg hover:shadow-tech-cyan">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-cyan-300 transition-colors">
                Immutable Digital Seals
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                SHA-256 hash checksums ensure that land mutation certificates, title deeds, and 7/12 extracts are 100% tamper-evident.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. HOW IT WORKS: 4-STEP CITIZEN FLOW */}
      <section className="py-20 bg-slate-50 text-slate-900 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-mono font-bold text-cyan-600 uppercase tracking-widest">
              END-TO-END WORKFLOW
            </span>
            <h2 className="text-xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              How Smart Property Verification Works
            </h2>
            <p className="text-sm text-slate-600">
              From ULPIN search to 3D exploration and field officer resolution in four simple steps.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
            {/* Step 1 */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-tech relative space-y-3">
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-cyan-400 font-mono font-extrabold text-sm flex items-center justify-center">
                01
              </div>
              <h4 className="text-base font-extrabold text-slate-900">Search Property</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Enter 14-digit ULPIN, Property ID, or Survey Number to retrieve official digitized records instantly.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-tech relative space-y-3">
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-cyan-400 font-mono font-extrabold text-sm flex items-center justify-center">
                02
              </div>
              <h4 className="text-base font-extrabold text-slate-900">Explore 2D & 3D Twin</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Inspect GIS boundary coordinates, explode 3D building floors, and verify individual apartment unit titles.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-tech relative space-y-3">
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-cyan-400 font-mono font-extrabold text-sm flex items-center justify-center">
                03
              </div>
              <h4 className="text-base font-extrabold text-slate-900">Verify or Flag Issues</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Check compliance status or raise boundary discrepancy dispute with photo & DGPS evidence attachment.
              </p>
            </div>

            {/* Step 4 */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-tech relative space-y-3">
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-cyan-400 font-mono font-extrabold text-sm flex items-center justify-center">
                04
              </div>
              <h4 className="text-base font-extrabold text-slate-900">Officer Ground Check</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Assigned revenue officer visits site, conducts RTK survey, updates status, and issues digital certificate.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. DUAL BENEFIT MATRIX (For Citizens vs. For Authorities) */}
      <section className="py-20 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Citizens Card */}
            <div className="p-8 bg-slate-900 text-white rounded-2xl border border-slate-800 relative overflow-hidden space-y-6">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest font-bold">
                  CITIZEN EMPOWERMENT
                </span>
                <h3 className="text-xl font-extrabold tracking-tight mt-1">Benefits for Property Owners &amp; Buyers</h3>
              </div>

              <ul className="space-y-3.5 text-xs text-slate-300">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <span>Instant verification before buying land to avoid forged titles and fraudulent double-selling.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <span>Interactive 3D building exploration to confirm carpet area, floor compliance, and unit occupancy.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <span>Online dispute filing with rapid turnaround and direct communication with assigned revenue officers.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <span>Download tamper-evident digital ownership card backed by cryptographic SHA-256 validation.</span>
                </li>
              </ul>

              <div className="pt-2">
                <Link
                  href="/properties"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-all shadow-tech-cyan"
                >
                  <span>Search Cadastre Now</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Government Authorities Card */}
            <div className="p-8 bg-slate-950 text-white rounded-2xl border border-slate-800 relative overflow-hidden space-y-6">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                <Building className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-mono text-blue-400 uppercase tracking-widest font-bold">
                  GOVERNMENT & REVENUE
                </span>
                <h3 className="text-xl font-extrabold tracking-tight mt-1">Benefits for Revenue &amp; Cadastre Officers</h3>
              </div>

              <ul className="space-y-3.5 text-xs text-slate-300">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <span>Single-window revenue workbench for DGPS field inspection scheduling and drone demarcation.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <span>Automated boundary conflict detection flagging encroachment against master revenue maps.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <span>100% digital audit trail for all approvals, mutations, and sub-division demarcation changes.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <span>Statewide cadastre analytics, tax collection optimization, and revenue leak prevention.</span>
                </li>
              </ul>

              <div className="pt-2">
                <Link
                  href="/dashboard/officer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all"
                >
                  <span>Officer Portal Login</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. FEATURED CADASTRAL PROPERTIES */}
      <section className="py-20 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-12">
            <div>
              <span className="text-xs font-mono font-bold text-cyan-600 uppercase tracking-widest">
                LIVE PARCEL REPOSITORIES
              </span>
              <h2 className="text-xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
                Explore Featured 3D & 2D Verified Properties
              </h2>
            </div>

            <Link
              href="/properties"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-700 hover:text-cyan-800 hover:underline"
            >
              <span>View All Registered Parcels</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredProperties.map((prop) => (
              <PropertyCard key={prop.id} property={prop} />
            ))}
          </div>
        </div>
      </section>

      {/* 6. CALL TO ACTION BANNER */}
      <section className="py-16 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white text-center border-b border-slate-800 relative">
        <div className="max-w-4xl mx-auto px-4 space-y-6">
          <h2 className="text-xl sm:text-3xl font-extrabold tracking-tight">
            Ready to Verify Your Land or Property Record?
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
            Enter your 14-digit ULPIN or property identification number to view interactive 3D digital twins, check boundary compliance, and download verified certificates.
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/properties"
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold text-xs tracking-tight shadow-tech-cyan transition-all"
            >
              Launch Cadastre Registry
            </Link>
            <Link
              href="/disputes/new"
              className="px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-bold text-xs transition-all"
            >
              Report Discrepancy
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
