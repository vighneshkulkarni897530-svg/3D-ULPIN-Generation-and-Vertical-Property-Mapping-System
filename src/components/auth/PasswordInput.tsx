'use client';

/**
 * PasswordInput (Phase — Login & Sign Up completion)
 * ---------------------------------------------------
 * Accessible password field with a show/hide toggle. Used by the login,
 * registration and reset-password pages so the interaction is identical
 * everywhere. Styling matches the existing auth form inputs exactly.
 */
import React from 'react';
import { Eye, EyeOff } from 'lucide-react';

export interface PasswordInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /** Render with left padding for the pages' decorative leading icon. */
  withLeadingIcon?: boolean;
  /** Visually-hidden hint announced by the toggle button (e.g. field name). */
  toggleLabelPrefix?: string;
}

export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ withLeadingIcon = true, toggleLabelPrefix = 'password', className = '', ...props }, ref) => {
    const [visible, setVisible] = React.useState(false);

    return (
      <div className="relative">
        <input
          ref={ref}
          type={visible ? 'text' : 'password'}
          {...props}
          className={`w-full bg-slate-950 border border-slate-800 focus:border-cyan-400 text-white rounded-xl ${
            withLeadingIcon ? 'pl-10' : 'pl-4'
          } pr-11 py-2.5 text-xs font-medium focus:ring-2 focus:ring-cyan-500/20 outline-none ${className}`}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? `Hide ${toggleLabelPrefix}` : `Show ${toggleLabelPrefix}`}
          aria-pressed={visible}
          title={visible ? 'Hide password' : 'Show password'}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 transition-colors hover:text-cyan-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40 rounded-lg"
        >
          {visible ? <EyeOff className="w-4 h-4" aria-hidden /> : <Eye className="w-4 h-4" aria-hidden />}
        </button>
      </div>
    );
  },
);

PasswordInput.displayName = 'PasswordInput';

export default PasswordInput;