'use client';

import React, { useState } from 'react';
import { type InvestigationNote } from '@/types/verificationCase';
import { addInvestigationNote } from '@/lib/society/verificationWorkflowService';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { MessageSquare, Send, User, Lock, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InvestigationNotesCardProps {
  caseId: string;
  notes: InvestigationNote[];
  onNoteAdded?: (note: InvestigationNote) => void;
  canAddNote?: boolean;
  className?: string;
}

export function InvestigationNotesCard({
  caseId,
  notes,
  onNoteAdded,
  canAddNote = true,
  className,
}: InvestigationNotesCardProps) {
  const { toast } = useToast();
  const [noteText, setNoteText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;

    setIsSubmitting(true);
    try {
      const added = await addInvestigationNote({
        caseId,
        text: noteText.trim(),
      });

      toast({
        variant: 'success',
        title: 'Investigation note appended',
        description: 'Note added to the immutable case record.',
      });

      setNoteText('');
      if (onNoteAdded) onNoteAdded(added);
    } catch (err) {
      console.error('Failed to append note:', err);
      toast({
        variant: 'destructive',
        title: 'Failed to add note',
        description: err instanceof Error ? err.message : 'Something went wrong.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={cn('rounded-2xl border border-slate-200 bg-white p-5 shadow-tech space-y-4', className)}>
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-800">
          <MessageSquare className="h-4 w-4 text-cyan-600" />
          Officer Investigation Notes ({notes.length})
        </h4>
        <span className="flex items-center gap-1 text-[10px] font-semibold text-slate-400">
          <Lock className="h-3 w-3" /> Append-only Log
        </span>
      </div>

      {/* Notes Thread */}
      <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
        {notes.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-4 text-center text-xs text-slate-400">
            No investigation notes recorded yet. Add initial inspection notes below.
          </p>
        ) : (
          notes.map((note) => (
            <div
              key={note.id}
              className="rounded-xl border border-slate-100 bg-slate-50/80 p-3.5 text-xs space-y-1.5"
            >
              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span className="flex items-center gap-1.5 font-bold text-slate-700">
                  <User className="h-3 w-3 text-cyan-600" />
                  {note.authorName} ({note.authorRole})
                </span>
                <span className="font-mono">
                  {note.createdAt ? note.createdAt.toLocaleString('en-IN') : '—'}
                </span>
              </div>
              <p className="text-slate-800 whitespace-pre-wrap leading-relaxed">{note.text}</p>
            </div>
          ))
        )}
      </div>

      {/* Append Note Form */}
      {canAddNote && (
        <form onSubmit={handleSubmitNote} className="space-y-2 pt-2 border-t border-slate-100">
          <Textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Enter official investigation observations, field notes, or requirements…"
            rows={2}
            disabled={isSubmitting}
            className="text-xs resize-none"
          />
          <div className="flex justify-end">
            <Button
              type="submit"
              size="sm"
              disabled={!noteText.trim() || isSubmitting}
              className="gap-1.5 text-xs font-bold"
            >
              {isSubmitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              Append Note
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
