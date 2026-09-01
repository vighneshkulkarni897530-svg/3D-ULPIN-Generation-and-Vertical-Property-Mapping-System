/**
 * Password policy (Phase — Login & Sign Up completion)
 * =====================================================
 * PURE module (no React, no Node APIs) shared by:
 *   - the registration page / reset-password page (live requirement checklist)
 *   - the server user store (`registerUser`, `resetUserPassword`) which is the
 *     authoritative enforcement point — client checks are UX only.
 *
 * The existing demo credentials (`Bhu-Verify#2024`) already satisfy this
 * policy, so seeded demo accounts are unaffected.
 */

export interface PasswordRequirement {
  /** Stable key used by UI checklists and validation messages. */
  key: 'length' | 'uppercase' | 'lowercase' | 'number' | 'special';
  /** Human-readable requirement shown in the UI. */
  label: string;
  test: (password: string) => boolean;
}

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

/** The password policy — server-enforced for registration and password reset. */
export const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
  { key: 'length', label: 'Minimum 8 characters', test: (p) => p.length >= PASSWORD_MIN_LENGTH },
  { key: 'uppercase', label: 'Uppercase letter (A–Z)', test: (p) => /[A-Z]/.test(p) },
  { key: 'lowercase', label: 'Lowercase letter (a–z)', test: (p) => /[a-z]/.test(p) },
  { key: 'number', label: 'Number (0–9)', test: (p) => /\d/.test(p) },
  { key: 'special', label: 'Special character (!@#$…)', test: (p) => /[^A-Za-z0-9]/.test(p) },
];

/** Keys of the requirements the given password does NOT satisfy. */
export function passwordPolicyIssues(password: unknown): string[] {
  if (typeof password !== 'string') return PASSWORD_REQUIREMENTS.map((r) => r.key);
  if (password.length > PASSWORD_MAX_LENGTH) return ['length'];
  return PASSWORD_REQUIREMENTS.filter((r) => !r.test(password)).map((r) => r.key);
}

/** True when the password satisfies every requirement. */
export function isPasswordPolicyCompliant(password: unknown): boolean {
  return passwordPolicyIssues(password).length === 0;
}