'use client';

import React from 'react';
import Link from 'next/link';
import { PropertyItem } from '@/types';
import { StatusBadge } from '../common/StatusBadge';
import { 
  Building, 
  MapPin, 
  Layers, 
  Compass, 
  ArrowRight, 
  ShieldCheck, 
  AlertCircle, 
  FileText,
  Sparkles
} from 'lucide-react';

interface PropertyCardProps {
  property: PropertyItem;
}

export const PropertyCard: React.FC<PropertyCardProps> = ({ property }) => {
  return (
    <div className="group bg-white border border-slate-200/90 hover:border-cyan-500/50 rounded-2xl overflow-hidden shadow-tech hover:shadow-tech-lg transition-all duration-300 flex flex-col justify-between">
      {/* Top Image Preview & Badges */}
      <div className="relative h-48 sm:h-52 w-full overflow-hidden bg-slate-900">
        <img
          src={property.featuredImageUrl}
          alt={property.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent" />

        {/* Status Badge in Top Right */}
        <div className="absolute top-3 right-3 z-10">
          <StatusBadge status={property.verificationStatus} size="sm" />
        </div>

        {/* Property Type Pill in Top Left */}
        <div className="absolute top-3 left-3 z-10">
          <span className="px-2.5 py-1 rounded-lg bg-slate-900/80 backdrop-blur-md border border-slate-700 text-cyan-300 text-[10px] font-mono font-bold uppercase tracking-wider">
            {property.propertyType}
          </span>
        </div>

        {/* ULPIN Overlay Tag at Bottom of Image */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-white">
          <div className="flex items-center gap-1.5 font-mono font-bold bg-slate-900/80 px-2.5 py-1 rounded-md border border-slate-700 backdrop-blur-sm">
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <span>ULPIN: {property.ulpin}</span>
          </div>
          <span className="text-[11px] font-mono bg-slate-900/80 px-2 py-0.5 rounded text-slate-300">
            Survey {property.landDetails.surveyNumber}
          </span>
        </div>
      </div>

      {/* Body Content */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div>
          <h4 className="text-base font-extrabold text-slate-900 group-hover:text-cyan-700 transition-colors line-clamp-1 tracking-tight">
            {property.title}
          </h4>

          <div className="flex items-start gap-1.5 text-xs text-slate-500 mt-1.5">
            <MapPin className="w-3.5 h-3.5 text-cyan-600 shrink-0 mt-0.5" />
            <p className="line-clamp-1">{property.address}</p>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 gap-2.5 py-3 border-y border-slate-100 bg-slate-50/60 rounded-xl px-3 text-xs">
          <div>
            <span className="text-slate-400 text-[11px]">Land Area</span>
            <p className="font-bold text-slate-900 font-mono">
              {property.landDetails.landAreaAcres} Acres
            </p>
          </div>
          <div>
            <span className="text-slate-400 text-[11px]">Govt Valuation</span>
            <p className="font-bold text-slate-900 font-mono">
              ₹{(property.governmentValuationINR / 10000000).toFixed(2)} Cr
            </p>
          </div>
          <div>
            <span className="text-slate-400 text-[11px]">Primary Owner</span>
            <p className="font-semibold text-slate-800 truncate">{property.primaryOwnerName}</p>
          </div>
          <div>
            <span className="text-slate-400 text-[11px]">Tax Status</span>
            <p
              className={`font-semibold ${
                property.landDetails.taxPaymentStatus === 'PAID'
                  ? 'text-emerald-600'
                  : 'text-amber-600'
              }`}
            >
              {property.landDetails.taxPaymentStatus}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-1">
          <Link
            href={`/properties/${property.id}`}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-300 hover:text-white border border-slate-700 text-xs font-bold transition-all group/btn shadow-sm"
          >
            <span>View 3D & Cadastre</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform" />
          </Link>

          <Link
            href={`/properties/${property.id}?tab=status`}
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-200 transition-colors"
            title="Verification Status Tracker"
          >
            <ShieldCheck className="w-4 h-4 text-cyan-600" />
          </Link>
        </div>
      </div>
    </div>
  );
};
