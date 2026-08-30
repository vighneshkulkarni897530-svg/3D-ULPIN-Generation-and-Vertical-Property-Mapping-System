'use client';

import React from 'react';
import { PropertyDocument } from '@/types';
import { 
  FileText, 
  Download, 
  X, 
  ShieldCheck, 
  CheckCircle2, 
  Clock, 
  Lock, 
  QrCode,
  ExternalLink
} from 'lucide-react';

interface DocumentViewerModalProps {
  document: PropertyDocument | null;
  onClose: () => void;
}

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({ document, onClose }) => {
  if (!document) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest block font-bold">
                CADASTRAL VAULT RECORD
              </span>
              <h3 className="text-base font-extrabold tracking-tight">{document.title}</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {/* Document Verification Security Seal */}
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs">
              <h5 className="font-bold text-emerald-900">Cryptographically Authenticated Record</h5>
              <p className="text-emerald-700 mt-0.5">
                Verified by {document.verifiedByOfficer || 'State Cadastral Registry'}. Checksum matched with master Bhoomika ledger.
              </p>
            </div>
          </div>

          {/* Document Details Metadata */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-500">Document Type</span>
              <p className="font-bold text-slate-900 mt-0.5">{document.documentType.replace(/_/g, ' ')}</p>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-500">File Size</span>
              <p className="font-bold text-slate-900 mt-0.5 font-mono">{document.fileSize}</p>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-500">Registration Date</span>
              <p className="font-bold text-slate-900 mt-0.5 font-mono">{document.uploadDate}</p>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-500">Legality Status</span>
              <p className="font-bold text-emerald-600 mt-0.5 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Verified & Active
              </p>
            </div>
          </div>

          {/* Cryptographic SHA-256 Hash Box */}
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-cyan-600" />
              SHA-256 Digital Checksum
            </span>
            <div className="p-3 bg-slate-900 text-cyan-300 font-mono text-[11px] rounded-xl border border-slate-800 break-all select-all">
              {document.sha256Checksum}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
            <QrCode className="w-4 h-4 text-slate-700" />
            <span>Digital Cadastre Token Valid</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
            >
              Close
            </button>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                alert(`Downloading verified copy of "${document.title}" (PDF)`);
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-300 text-xs font-bold transition-all shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              Download Verified PDF
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
