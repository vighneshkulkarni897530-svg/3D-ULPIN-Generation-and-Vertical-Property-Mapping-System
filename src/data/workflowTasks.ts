/**
 * Workflow Task demo data (Phase 9)
 * =================================
 * Seed tasks reference REAL entities in the centralized GIS registry
 * (properties, conflicts, parcels, buildings) by id. No registry data is
 * duplicated here — only task metadata.
 *
 * Timestamps are generated relative to "now" so the demo always looks live.
 */
import type { Collaborator, WorkflowTask } from '@/types/workflow';

const DAY = 24 * 60 * 60 * 1000;
const ISO = (offsetMs: number): string => new Date(Date.now() + offsetMs).toISOString();

export const MOCK_WORKFLOW_TASKS: WorkflowTask[] = [
  {
    id: 'TASK-001',
    title: 'Field verification — PROP-102-G02',
    description:
      'Complete a demo site visit for unit G-02 (Green View Residency, B-102). Confirm the commercial boundary and record geo-tagged evidence.',
    entityType: 'FIELD_VERIFICATION',
    entityId: 'PROP-102-G02',
    priority: 'MEDIUM',
    status: 'ASSIGNED',
    assignedOfficerId: 'usr-off-202',
    assignedOfficerName: 'Dr. Ananya Iyer, IAS',
    createdBy: 'OFFICER',
    createdByName: 'Dr. Ananya Iyer, IAS',
    createdAt: ISO(-2 * DAY),
    dueDate: ISO(3 * DAY),
    history: [
      { id: 'H-1010', timestamp: ISO(-2 * DAY), actor: 'Dr. Ananya Iyer, IAS', actorRole: 'OFFICER', action: 'Task created', note: 'Created from the verification workspace (Send to Field Verification).' },
      { id: 'H-1011', timestamp: ISO(-1 * DAY), actor: 'K. S. Narayana Swamy', actorRole: 'ADMIN', action: 'Task assigned', note: 'Assigned to the field officer queue.' },
    ],
  },
  {
    id: 'TASK-002',
    title: 'Investigate & resolve CONFLICT-001',
    description:
      'Critical boundary overlap between PARCEL-MH-PUN-001 and PARCEL-MH-PUN-002. Review the prototype validation output and coordinate the survey team.',
    entityType: 'CONFLICT',
    entityId: 'CONFLICT-001',
    priority: 'CRITICAL',
    status: 'IN_PROGRESS',
    assignedOfficerId: 'usr-off-202',
    assignedOfficerName: 'Dr. Ananya Iyer, IAS',
    createdBy: 'SYSTEM',
    createdByName: 'Spatial Validation Engine',
    createdAt: ISO(-5 * DAY),
    dueDate: ISO(2 * DAY),
    history: [
      { id: 'H-1020', timestamp: ISO(-5 * DAY), actor: 'Spatial Validation Engine', actorRole: 'SYSTEM', action: 'Task created', note: 'Auto-created from critical conflict detection.' },
      { id: 'H-1021', timestamp: ISO(-4 * DAY), actor: 'Dr. Ananya Iyer, IAS', actorRole: 'OFFICER', action: 'Status → IN_PROGRESS', note: 'Field survey scheduled.' },
    ],
  },
  {
    id: 'TASK-003',
    title: 'Re-inspection — PROP-306-0201',
    description:
      'Re-inspect unit PROP-306-0201 (Tech Tower, B-306) — previous demo check required follow-up. Confirm boundary vs parent parcel.',
    entityType: 'REINSPECTION',
    entityId: 'PROP-306-0201',
    priority: 'HIGH',
    status: 'ASSIGNED',
    assignedOfficerId: 'usr-off-204',
    assignedOfficerName: 'Sanjay Verma, IAS',
    createdBy: 'OFFICER',
    createdByName: 'Dr. Ananya Iyer, IAS',
    createdAt: ISO(-6 * DAY),
    dueDate: ISO(-1 * DAY), // overdue on purpose for demo
    history: [
      { id: 'H-1030', timestamp: ISO(-6 * DAY), actor: 'Dr. Ananya Iyer, IAS', actorRole: 'OFFICER', action: 'Task created', note: 'Reinspection requested from the verification workspace.' },
    ],
  },
  {
    id: 'TASK-004',
    title: 'Data review — PARCEL-MH-PUN-002',
    description:
      'Review the parcel record for dimensional inconsistencies surfaced by the prototype spatial validation pipeline.',
    entityType: 'DATA_REVIEW',
    entityId: 'PARCEL-MH-PUN-002',
    priority: 'MEDIUM',
    status: 'UNDER_REVIEW',
    assignedOfficerId: 'usr-adm-303',
    assignedOfficerName: 'K. S. Narayana Swamy',
    createdBy: 'ADMIN',
    createdByName: 'K. S. Narayana Swamy',
    createdAt: ISO(-3 * DAY),
    dueDate: ISO(4 * DAY),
    history: [
      { id: 'H-1040', timestamp: ISO(-3 * DAY), actor: 'K. S. Narayana Swamy', actorRole: 'ADMIN', action: 'Task created' },
      { id: 'H-1041', timestamp: ISO(-1 * DAY), actor: 'K. S. Narayana Swamy', actorRole: 'ADMIN', action: 'Status → UNDER_REVIEW', note: 'Awaiting registry comparison.' },
    ],
  },
  {
    id: 'TASK-005',
    title: 'Building boundary review — B-306',
    description:
      'Tech Tower has no survey boundary polygon recorded (demo conflict CONFLICT-002). Plan a boundary extraction run via the AI workspace.',
    entityType: 'BUILDING',
    entityId: 'B-306',
    priority: 'HIGH',
    status: 'PENDING',
    createdBy: 'ADMIN',
    createdByName: 'K. S. Narayana Swamy',
    createdAt: ISO(-1 * DAY),
    dueDate: ISO(6 * DAY),
    history: [
      { id: 'H-1050', timestamp: ISO(-1 * DAY), actor: 'K. S. Narayana Swamy', actorRole: 'ADMIN', action: 'Task created' },
    ],
  },
  {
    id: 'TASK-006',
    title: 'Verification review — PROP-104-0401',
    description:
      'Unit PROP-104-0401 was rejected in the demo queue. Review the officer notes and schedule a re-verification or correction.',
    entityType: 'PROPERTY',
    entityId: 'PROP-104-0401',
    priority: 'MEDIUM',
    status: 'COMPLETED',
    assignedOfficerId: 'usr-off-204',
    assignedOfficerName: 'Sanjay Verma, IAS',
    createdBy: 'OFFICER',
    createdByName: 'Dr. Ananya Iyer, IAS',
    createdAt: ISO(-8 * DAY),
    completedAt: ISO(-2 * DAY),
    history: [
      { id: 'H-1060', timestamp: ISO(-8 * DAY), actor: 'Dr. Ananya Iyer, IAS', actorRole: 'OFFICER', action: 'Task created' },
      { id: 'H-1061', timestamp: ISO(-2 * DAY), actor: 'Sanjay Verma, IAS', actorRole: 'OFFICER', action: 'Status → COMPLETED', note: 'Record corrected and re-submitted.' },
    ],
  },
];

/**
 * Demo Collaboration Presence — clearly simulated, not real-time.
 * Seed set mirrors the demo personas used by AuthContext and the admin
 * dashboard, plus a field officer.
 */
export const MOCK_COLLABORATORS: Collaborator[] = [
  {
    id: 'usr-off-202',
    name: 'Dr. Ananya Iyer, IAS',
    designation: 'Senior Cadastral Revenue Officer & Joint Registrar',
    role: 'OFFICER',
    status: 'ACTIVE',
    lastSeen: new Date().toISOString(),
    badgeNumber: 'KA-REV-7782',
  },
  {
    id: 'usr-off-204',
    name: 'Sanjay Verma, IAS',
    designation: 'District Revenue Officer',
    role: 'OFFICER',
    status: 'AWAY',
    lastSeen: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
    badgeNumber: 'DPD-RO-2210',
  },
  {
    id: 'usr-off-205',
    name: 'Priya Nair',
    designation: 'Field Survey Officer',
    role: 'OFFICER',
    status: 'OFFLINE',
    lastSeen: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
    badgeNumber: 'FLD-4077',
  },
  {
    id: 'usr-adm-303',
    name: 'K. S. Narayana Swamy',
    designation: 'State Cadastral Data Director & Systems Chief',
    role: 'ADMIN',
    status: 'ACTIVE',
    lastSeen: new Date().toISOString(),
    badgeNumber: 'ADMIN-DIR-009',
  },
];