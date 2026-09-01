'use client';

/**
 * PasswordRequirements (Phase — Login & Sign Up completion)
 * ----------------------------------------------------------
 * Live checklist of the password policy shared by the registration and
 * reset-password pages. The rules come from the PURE passwordPolicy module —
 * the same module the server enforces — so the UI can never show requirements
 * that differ from the server's. Indicators combine icon shape + text (never
 * colour alone) and the list is announced politely to screen readers.
 */
import React from 'react';
import { Check, Circle } from 'lucide-react';
import { PASSWORD_REQUIREMENTS } from '@/lib/auth/passwordPolicy';

export function evaluatePasswordRequirements(password: string): Record<string, boolean> {
  const result: Record<string, boolean> = {};
  for (const requirement of PASSWORD_REQUIREMENTS) {
    result[requirement.key] = requirement.test(password);
  }
  return result;
}

export const PasswordRequirements: React.FC<{ password: string; className?: string }> = ({ password, className = '' }) => {
  const status = React.useMemo(() => evaluatePasswordRequirements(password), [password]);

  return (
    <div className={className}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Password must contain:</p>
      <ul className="space-y-0.5" aria-live="polite">
        {PASSWORD_REQUIREMENTS.map((requirement) => {
          const met = status[requirement.key] ?? false;
          return (
            <li key={requirement.key} className="flex items-center gap-1.5 text-[10px] font-bold">
              {met ? (
                <>
                  <Check className="h-3 w-3 text-emerald-400" aria-hidden />
                  <span className="text-emerald-300">{requirement.label}</span>
                  <span className="sr-only">(requirement met)</span>
                </>
              ) : (
                <>
                  <Circle className="h-2 w-2 text-slate-600" aria-hidden />
                  <span className="text-slate-500">{requirement.label}</span>
                  <span className="sr-only">(requirement not met yet)</span>
                </>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default PasswordRequirements;