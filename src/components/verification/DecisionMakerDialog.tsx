'use client';

import React, { useState } from 'react';
import {
  type VerificationDecision,
  type CaseStatus,
  VERIFICATION_DECISIONS,
  VERIFICATION_DECISION_LABELS,
} from '@/types/verificationCase';
import { recordCaseDecision } from '@/lib/society/verificationWorkflowService';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { useToast } from '@/hooks/use-toast';
import { ShieldCheck, AlertTriangle, CheckCircle2, XCircle, RefreshCw, Loader2 } from 'lucide-react';

interface DecisionMakerDialogProps {
  caseId: string;
  isOpen: boolean;
  onClose: () => void;
  onDecisionRecorded: () => void;
  initialDecision?: VerificationDecision;
}

export function DecisionMakerDialog({
  caseId,
  isOpen,
  onClose,
  onDecisionRecorded,
  initialDecision = 'VERIFIED',
}: DecisionMakerDialogProps) {
  const { toast } = useToast();
  const [decision, setDecision] = useState<VerificationDecision>(initialDecision);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleOpenConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      toast({
        variant: 'destructive',
        title: 'Reason required',
        description: 'An official government decision requires a detailed justification and reason.',
      });
      return;
    }
    setShowConfirm(true);
  };

  const handleExecuteDecision = async () => {
    setIsSubmitting(true);
    try {
      await recordCaseDecision({
        caseId,
        decision,
        reason: reason.trim(),
      });

      toast({
        variant: 'success',
        title: 'Official decision recorded',
        description: `Marked case as ${VERIFICATION_DECISION_LABELS[decision]}.`,
      });

      setShowConfirm(false);
      onClose();
      onDecisionRecorded();
    } catch (err) {
      console.error('Failed to record case decision:', err);
      toast({
        variant: 'destructive',
        title: 'Failed to record decision',
        description: err instanceof Error ? err.message : 'Something went wrong.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
              <ShieldCheck className="h-5 w-5 text-cyan-600" />
              Record Official Verification Decision
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Official cadastral determinations are permanently logged to the audit trail.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleOpenConfirm} className="space-y-4 py-2">
            {/* Decision selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Official Determination
              </label>
              <div className="grid grid-cols-1 gap-2">
                {VERIFICATION_DECISIONS.map((dec) => {
                  const selected = decision === dec;
                  return (
                    <div
                      key={dec}
                      onClick={() => setDecision(dec)}
                      className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 text-xs transition-all ${
                        selected
                          ? 'border-cyan-600 bg-cyan-50/60 font-bold text-cyan-900 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {dec === 'VERIFIED' && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                        {dec === 'REQUIRES_CORRECTION' && (
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                        )}
                        {dec === 'REINSPECTION_REQUIRED' && (
                          <RefreshCw className="h-4 w-4 text-blue-500" />
                        )}
                        {dec === 'REJECTED' && <XCircle className="h-4 w-4 text-red-600" />}
                        <span>{VERIFICATION_DECISION_LABELS[dec]}</span>
                      </div>
                      <input
                        type="radio"
                        name="decisionChoice"
                        checked={selected}
                        onChange={() => setDecision(dec)}
                        className="text-cyan-600"
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Mandatory Reason */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Detailed Justification &amp; Findings (Mandatory)
              </label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Detail the basis for this determination, referencing attached evidence, field measurements, and verified records…"
                rows={3}
                required
                className="text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={onClose} className="text-xs">
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={!reason.trim()} className="text-xs font-bold">
                Review &amp; Confirm Decision
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        open={showConfirm}
        onOpenChange={setShowConfirm}
        title="Confirm Official Government Decision?"
        description={`You are about to record the decision "${VERIFICATION_DECISION_LABELS[decision]}". This will be permanently recorded in the official audit registry.`}
        confirmLabel={isSubmitting ? 'Recording…' : 'Confirm & Write to Audit'}
        tone={decision === 'REJECTED' ? 'destructive' : 'default'}
        onConfirm={handleExecuteDecision}
        loading={isSubmitting}
      />
    </>
  );
}
