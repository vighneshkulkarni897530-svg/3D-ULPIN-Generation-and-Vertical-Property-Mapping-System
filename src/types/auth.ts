/**
 * Authentication & Authorization Types (Phase 10)
 * ================================================
 *
 * Auth mode distinguishes DEMO authentication (mock users / instant access)
 * from FUTURE PRODUCTION authentication (external government identity provider).
 *
 * The `AuthBackendAdapter` interface lets a real backend provider replace
 * the demo adapter without touching application components.
 */

/** Whether the current session was established via demo or production auth. */
export type AuthMode = 'DEMO' | 'PRODUCTION';

/** Auth-method identifier for audit logging. */
export type AuthMethod = 'DEMO_FORM' | 'AADHAAR_OTP' | 'DIGILOCKER' | 'SERVICE_ACCOUNT';

/** Credentials submitted at login. */
export interface AuthCredentials {
  email: string;
  password: string;
  /** Optional auth-method hint (demo forms always use DEMO_FORM). */
  method?: AuthMethod;
}

/** Result returned by an AuthBackendAdapter. */
export interface AuthResult {
  success: boolean;
  user?: import('@/types').User;
  error?: string;
  authMode: AuthMode;
  authMethod: AuthMethod;
}

/**
 * Adapter interface for plugging in a real authentication backend.
 * The default demo implementation validates against MOCK_USERS.
 */
export interface AuthBackendAdapter {
  /** Validate credentials and return a user record on success. */
  authenticate: (credentials: AuthCredentials) => Promise<AuthResult>;
  /** Fetch a user by ID (optional — used for session restoration). */
  getUser?: (id: string) => Promise<import('@/types').User | null>;
}

/** Persisted session data stored in localStorage (demo) or managed by the backend (production). */
export interface AuthSession {
  user: import('@/types').User;
  role: import('@/types').UserRole;
  authMode: AuthMode;
  authMethod: AuthMethod;
  /** ISO timestamp of session creation. */
  createdAt: string;
  /** ISO timestamp of last activity. */
  lastSeen: string;
}

/**
 * System-wide permission keys. Each permission is a granular capability
 * that a role is granted. Routes and UI elements check against permissions
 * via `canAccess()` rather than hard-coding role names.
 */
export const PERMISSIONS = {
  // ── Public browsing ──
  BROWSE_REGISTRY: 'browse_registry',

  // ── Citizen ──
  ACCESS_DASHBOARD_CITIZEN: 'access_dashboard_citizen',
  VIEW_OWN_NOTIFICATIONS: 'view_own_notifications',
  SUBMIT_DISPUTE: 'submit_dispute',
  REQUEST_FIELD_VERIFICATION: 'request_field_verification',
  VIEW_VERIFICATION_STATUS: 'view_verification_status',

  // ── Officer ──
  VERIFY_PROPERTY: 'verify_property',
  REJECT_PROPERTY: 'reject_property',
  REQUEST_REINSPECTION: 'request_reinspection',
  SEND_TO_FIELD_VERIFICATION: 'send_to_field_verification',
  MANAGE_CONFLICTS: 'manage_conflicts',
  RESOLVE_CONFLICT: 'resolve_conflict',
  SEND_CONFLICT_TO_FIELD_REVIEW: 'send_conflict_to_field_review',
  REQUEST_CONFLICT_CORRECTION: 'request_conflict_correction',
  RUN_SPATIAL_VALIDATION: 'run_spatial_validation',
  MANAGE_WORKFLOW_TASKS: 'manage_workflow_tasks',
  VIEW_VERIFICATION_QUEUE: 'view_verification_queue',
  VIEW_FIELDSHEET: 'view_fieldsheet',

  // ── Admin ──
  USER_MANAGEMENT: 'user_management',
  SYSTEM_ADMIN: 'system_admin',
  VIEW_REPORTS: 'view_reports',
  VIEW_ACTIVITY_LOG: 'view_activity_log',
  ACCESS_DASHBOARD_ADMIN: 'access_dashboard_admin',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/** Human-readable labels for permissions (used in UI where needed). */
export const PERMISSION_LABELS: Record<Permission, string> = {
  browse_registry: 'Browse Registry',
  view_own_notifications: 'View Own Notifications',
  submit_dispute: 'Submit Dispute',
  request_field_verification: 'Request Field Verification',
  view_verification_status: 'View Verification Status',
  verify_property: 'Verify Property',
  reject_property: 'Reject Property',
  request_reinspection: 'Request Reinspection',
  send_to_field_verification: 'Send to Field Verification',
  manage_conflicts: 'Manage Conflicts',
  resolve_conflict: 'Resolve Conflict',
  send_conflict_to_field_review: 'Send Conflict to Field Review',
  request_conflict_correction: 'Request Conflict Correction',
  run_spatial_validation: 'Run Spatial Validation',
  manage_workflow_tasks: 'Manage Workflow Tasks',
  view_verification_queue: 'View Verification Queue',
  view_fieldsheet: 'View Field Sheet',
  user_management: 'User Management',
  system_admin: 'System Administration',
  view_reports: 'View Reports',
  view_activity_log: 'View Activity Log',
  access_dashboard_admin: 'Access Admin Dashboard',
  access_dashboard_citizen: 'Access Citizen Dashboard',
};

/** Permission sets granted to each role. CITIZEN is the baseline. */
const CITIZEN_PERMISSIONS: Permission[] = [
  PERMISSIONS.BROWSE_REGISTRY,
  PERMISSIONS.VIEW_OWN_NOTIFICATIONS,
  PERMISSIONS.SUBMIT_DISPUTE,
  PERMISSIONS.REQUEST_FIELD_VERIFICATION,
  PERMISSIONS.VIEW_VERIFICATION_STATUS,
  // Reports & analytics are readable by every role (matrix: Reports ✓ ✓ ✓)
  PERMISSIONS.VIEW_REPORTS,
  PERMISSIONS.ACCESS_DASHBOARD_CITIZEN,
];

const OFFICER_PERMISSIONS: Permission[] = [
  // Inherits all CITIZEN permissions
  ...CITIZEN_PERMISSIONS,
  // Officer-specific
  PERMISSIONS.VERIFY_PROPERTY,
  PERMISSIONS.REJECT_PROPERTY,
  PERMISSIONS.REQUEST_REINSPECTION,
  PERMISSIONS.SEND_TO_FIELD_VERIFICATION,
  PERMISSIONS.MANAGE_CONFLICTS,
  PERMISSIONS.RESOLVE_CONFLICT,
  PERMISSIONS.SEND_CONFLICT_TO_FIELD_REVIEW,
  PERMISSIONS.REQUEST_CONFLICT_CORRECTION,
  PERMISSIONS.RUN_SPATIAL_VALIDATION,
  PERMISSIONS.MANAGE_WORKFLOW_TASKS,
  PERMISSIONS.VIEW_VERIFICATION_QUEUE,
  PERMISSIONS.VIEW_FIELDSHEET,
];

const ADMIN_PERMISSIONS: Permission[] = [
  // Inherits all OFFICER permissions
  ...OFFICER_PERMISSIONS,
  // Admin-specific
  PERMISSIONS.USER_MANAGEMENT,
  PERMISSIONS.SYSTEM_ADMIN,
  PERMISSIONS.VIEW_ACTIVITY_LOG,
  PERMISSIONS.ACCESS_DASHBOARD_ADMIN,
];

export const ROLE_PERMISSIONS: Record<import('@/types').UserRole, Permission[]> =
  {
    CITIZEN: CITIZEN_PERMISSIONS,
    OFFICER: OFFICER_PERMISSIONS,
    ADMIN: ADMIN_PERMISSIONS,
  };
