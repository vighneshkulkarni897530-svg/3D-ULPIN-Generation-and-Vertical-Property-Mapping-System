'use client';

import React from 'react';
import { PropertyItem, VerificationStatus, VerificationHistoryEvent } from '@/types';
import { 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  MapPin, 
  UserCheck, 
  FileSearch, 
  Award, 
  XCircle,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Phone,
  Mail
} from 'lucide-react';

interface VerificationTimelineProps {
  property: PropertyItem;
}

export const VerificationTimeline: React.FC<VerificationTimelineProps> = ({ property }) => {
  const currentStatus = property.verificationStatus;
  const history = property.verificationHistory || [];
  const officer = property.assignedOfficer;

  // The 6 standard lifecycle stages
  const STAGES: { key: VerificationStatus; label: string; icon: React.ComponentType<{ className?: string }>; desc: string }[] = [
    {
      key: 'SUBMITTED',
      label: 'Submitted',
      icon: FileSearch,
      desc: 'Application & Cadastral Record Ingested',
    },
    {
      key: 'UNDER_REVIEW',
      label: 'Under Review',
      icon: Clock,
      desc: 'Desk Audit & Title Cross-Matching',
    },
    {
      key: 'FIELD_VERIFICATION_REQUESTED',
      label: 'Field Verification Requested',
      icon: MapPin,
      desc: 'DGPS Ground Inspection Dispatched',
    },
    {
      key: 'OFFICER_ASSIGNED',
      label: 'Officer Assigned',
      icon: UserCheck,
      desc: 'Jurisdictional Revenue Officer Appointed',
    },
    {
      key: 'VERIFICATION_IN_PROGRESS',
      label: 'Verification in Progress',
      icon: ShieldCheck,
      desc: 'Physical Total-Station & Drone Survey',
    },
    {
      key: 'VERIFIED',
      label: 'Verified',
      icon: Award,
      desc: 'Cryptographic Bhu-Aadhaar Seal Granted',
    },
  ];

  // Determine stage progress index
  const getStageIndex = (status: VerificationStatus): number => {
    switch (status) {
      case 'SUBMITTED': return 0;
      case 'UNDER_REVIEW': return 1;
      case 'FIELD_VERIFICATION_REQUESTED': return 2;
      case 'OFFICER_ASSIGNED': return 3;
      case 'VERIFICATION_IN_PROGRESS': return 4;
      case 'VERIFIED': return 5;
      case 'DISPUTED': return 2;
      case 'REJECTED': return 1;
      default: return 0;
    }
  };

  const currentIndex = getStageIndex(currentStatus);
  const isRejected = currentStatus === 'REJECTED';
  const isDisputed = currentStatus === 'DISPUTED';

  return (
    <div className="space-y-6">
      {/* Top Banner Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl text-white">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <span className="text-xs font-mono text-cyan-400 uppercase tracking-wider font-bold">
              CADASTRE VERIFICATION LIFECYCLE
            </span>
            <h3 className="text-xl font-extrabold tracking-tight mt-1 flex items-center gap-3">
              {property.title}
              {currentStatus === 'VERIFIED' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-bold shadow-[0_0_12px_rgba(34,197,94,0.3)]">
                  <CheckCircle2 className="w-4 h-4" />
                  100% Legally Verified
                </span>
              )}
              {isDisputed && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 text-xs font-bold">
                  <AlertTriangle className="w-4 h-4" />
                  Active Dispute
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-400 mt-1 font-mono">
              ULPIN: {property.ulpin} • Property ID: {property.propertyId}
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 bg-slate-950 rounded-xl border border-slate-800 text-right">
              <span className="text-[10px] text-slate-400 uppercase">Current Stage</span>
              <p className="text-xs font-bold text-cyan-400">
                {currentStatus.replace(/_/g, ' ')}
              </p>
            </div>
          </div>
        </div>

        {/* Horizontal Visual Stepper (Desktop) */}
        <div className="mt-8 relative hidden md:block">
          {/* Connector Line */}
          <div className="absolute top-1/2 left-8 right-8 -translate-y-1/2 h-1 bg-slate-800 z-0">
            <div
              className={`h-full transition-all duration-500 ${
                isRejected
                  ? 'bg-rose-500'
                  : isDisputed
                  ? 'bg-amber-500'
                  : 'bg-gradient-to-r from-cyan-500 via-blue-500 to-emerald-500'
              }`}
              style={{ width: `${(Math.min(currentIndex, 5) / 5) * 100}%` }}
            />
          </div>

          <div className="relative z-10 grid grid-cols-6 gap-2 text-center">
            {STAGES.map((stage, idx) => {
              const isCompleted = idx < currentIndex || (idx === 5 && currentStatus === 'VERIFIED');
              const isCurrent = idx === currentIndex && currentStatus !== 'VERIFIED';
              const Icon = stage.icon;

              return (
                <div key={stage.key} className="flex flex-col items-center group">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 border-2 ${
                      isCompleted
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-[0_0_15px_rgba(34,197,94,0.5)] scale-105'
                        : isCurrent
                        ? 'bg-cyan-500 text-slate-950 border-cyan-300 shadow-tech-cyan animate-pulse scale-110'
                        : 'bg-slate-950 text-slate-500 border-slate-800'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
                    ) : (
                      <Icon className="w-5 h-5" />
                    )}
                  </div>
                  <h5
                    className={`text-xs font-bold mt-3 tracking-tight ${
                      isCompleted
                        ? 'text-emerald-400'
                        : isCurrent
                        ? 'text-cyan-300 font-extrabold'
                        : 'text-slate-500'
                    }`}
                  >
                    {stage.label}
                  </h5>
                  <p className="text-[10px] text-slate-400 mt-0.5 leading-tight px-1 hidden lg:block">
                    {stage.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Two Column Section: Assigned Officer Dossier + Audit Log Stepper */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Officer Card & Actions (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-tech">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-cyan-600" />
              Assigned Government Authority
            </h4>

            {officer ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <img
                    src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&auto=format&fit=crop&q=80"
                    alt={officer.name}
                    className="w-12 h-12 rounded-xl ring-2 ring-cyan-500/40 object-cover"
                  />
                  <div>
                    <h5 className="text-sm font-extrabold text-slate-900">{officer.name}</h5>
                    <p className="text-xs text-cyan-700 font-semibold">{officer.designation}</p>
                    <span className="text-[10px] text-slate-500 font-mono">Badge: KA-REV-7782</span>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Department:</span>
                    <span className="font-semibold text-slate-900 text-right text-[11px]">
                      {officer.department}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Direct Contact:</span>
                    <span className="font-mono text-cyan-600 font-bold">{officer.contactNumber}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <a
                    href={`tel:${officer.contactNumber}`}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-cyan-300 text-xs font-bold transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    Call Officer
                  </a>
                  <a
                    href="mailto:ananya.iyer@rev.gov.in"
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-bold transition-colors"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    Send Inquiry
                  </a>
                </div>
              </div>
            ) : (
              <div className="text-center p-4 text-xs text-slate-400">
                <Clock className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p>Officer allocation in progress by District Registrar Desk.</p>
              </div>
            )}
          </div>

          {/* Verification Seal Box */}
          {currentStatus === 'VERIFIED' && (
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-cyan-500/40 rounded-2xl p-5 shadow-tech-cyan text-white space-y-3">
              <div className="flex items-center gap-2 text-cyan-400">
                <Sparkles className="w-5 h-5" />
                <h5 className="text-xs font-bold uppercase tracking-wider">Cryptographic Cadastre Seal</h5>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                This property has been validated with RTK GNSS sub-meter precision and bears an immutable digital certificate.
              </p>
              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 font-mono text-[10px] text-cyan-300 break-all">
                SHA-256: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
              </div>
            </div>
          )}
        </div>

        {/* Right: Detailed Audit Trail Stepper (8 cols) */}
        <div className="lg:col-span-8">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-tech">
            <h4 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider mb-6 flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-600" />
              Complete Verification Audit Trail & Chronology
            </h4>

            <div className="space-y-6 relative before:absolute before:top-2 before:bottom-2 before:left-4 before:w-0.5 before:bg-slate-200">
              {history.map((event, idx) => {
                const isVerified = event.stage === 'VERIFIED';
                const isDispute = event.stage === 'DISPUTED';
                return (
                  <div key={event.id} className="relative flex items-start gap-4 pl-1">
                    {/* Circle Node */}
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ring-4 ring-white z-10 ${
                        isVerified
                          ? 'bg-emerald-500 text-white'
                          : isDispute
                          ? 'bg-rose-500 text-white'
                          : 'bg-cyan-500 text-slate-950'
                      }`}
                    >
                      {isVerified ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : isDispute ? (
                        <AlertTriangle className="w-4 h-4" />
                      ) : (
                        <span className="text-[11px] font-bold">{idx + 1}</span>
                      )}
                    </div>

                    {/* Event Content Card */}
                    <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-4 hover:bg-slate-100/70 transition-colors">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                        <h5 className="text-sm font-bold text-slate-900">{event.title}</h5>
                        <span className="text-[11px] font-mono text-slate-500">{event.timestamp}</span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">{event.description}</p>
                      
                      <div className="mt-3 pt-2.5 border-t border-slate-200 flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">
                          Authorized by: <strong className="text-slate-800">{event.actorName}</strong> ({event.actorRole})
                        </span>
                        {event.badgeNumber && (
                          <span className="font-mono text-cyan-700 font-semibold">{event.badgeNumber}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
