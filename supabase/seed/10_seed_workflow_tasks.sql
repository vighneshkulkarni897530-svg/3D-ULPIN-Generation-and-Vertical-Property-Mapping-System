-- Seed: Workflow Tasks (Phase 13)
begin;

insert into workflow_tasks
  (id, title, description, entity_type, entity_id, priority, status,
   assigned_officer_id, assigned_officer_name, created_by, created_by_name,
   due_date, completed_at, history, created_at, updated_at)
values
  ('TASK-001', 'Field verification — PROP-102-G02',
   'Complete a demo site visit for unit G-02 (Green View Residency, B-102). Confirm the commercial boundary and record geo-tagged evidence.',
   'FIELD_VERIFICATION', 'PROP-102-G02', 'MEDIUM', 'ASSIGNED',
   'usr-off-202', 'Dr. Ananya Iyer, IAS', 'OFFICER', 'Dr. Ananya Iyer, IAS',
   '2025-03-13T12:00:00Z', NULL,
   '[{"id":"H-1010","timestamp":"2025-03-08T12:00:00Z","actor":"Dr. Ananya Iyer, IAS","actorRole":"OFFICER","action":"Task created","note":"Created from the verification workspace."},{"id":"H-1011","timestamp":"2025-03-09T12:00:00Z","actor":"K. S. Narayana Swamy","actorRole":"ADMIN","action":"Task assigned","note":"Assigned to the field officer queue."}]'::jsonb,
   '2025-03-08T12:00:00Z', '2025-03-10T12:00:00Z'),

  ('TASK-002', 'Investigate & resolve CONFLICT-001',
   'Critical boundary overlap between PARCEL-MH-PUN-001 and PARCEL-MH-PUN-002. Review the prototype validation output and coordinate the survey team.',
   'CONFLICT', 'CONFLICT-001', 'CRITICAL', 'IN_PROGRESS',
   'usr-off-202', 'Dr. Ananya Iyer, IAS', 'SYSTEM', 'Spatial Validation Engine',
   '2025-03-12T12:00:00Z', NULL,
   '[{"id":"H-1020","timestamp":"2025-03-05T12:00:00Z","actor":"Spatial Validation Engine","actorRole":"SYSTEM","action":"Task created","note":"Auto-created from critical conflict detection."},{"id":"H-1021","timestamp":"2025-03-06T12:00:00Z","actor":"Dr. Ananya Iyer, IAS","actorRole":"OFFICER","action":"Status → IN_PROGRESS","note":"Field survey scheduled."}]'::jsonb,
   '2025-03-05T12:00:00Z', '2025-03-10T12:00:00Z'),

  ('TASK-003', 'Re-inspection — PROP-306-0201',
   'Re-inspect unit PROP-306-0201 (Tech Tower, B-306) — previous demo check required follow-up. Confirm boundary vs parent parcel.',
   'REINSPECTION', 'PROP-306-0201', 'HIGH', 'ASSIGNED',
   'usr-off-204', 'Sanjay Verma, IAS', 'OFFICER', 'Dr. Ananya Iyer, IAS',
   '2025-03-04T12:00:00Z', NULL,
   '[{"id":"H-1030","timestamp":"2025-03-04T12:00:00Z","actor":"Dr. Ananya Iyer, IAS","actorRole":"OFFICER","action":"Task created","note":"Reinspection requested from the verification workspace."}]'::jsonb,
   '2025-03-04T12:00:00Z', '2025-03-09T12:00:00Z'),

  ('TASK-004', 'Data review — PARCEL-MH-PUN-002',
   'Review the parcel record for dimensional inconsistencies surfaced by the prototype spatial validation pipeline.',
   'DATA_REVIEW', 'PARCEL-MH-PUN-002', 'MEDIUM', 'UNDER_REVIEW',
   'usr-adm-303', 'K. S. Narayana Swamy', 'ADMIN', 'K. S. Narayana Swamy',
   '2025-03-11T12:00:00Z', NULL,
   '[{"id":"H-1040","timestamp":"2025-03-07T12:00:00Z","actor":"K. S. Narayana Swamy","actorRole":"ADMIN","action":"Task created"},{"id":"H-1041","timestamp":"2025-03-09T12:00:00Z","actor":"K. S. Narayana Swamy","actorRole":"ADMIN","action":"Status → UNDER_REVIEW","note":"Awaiting registry comparison."}]'::jsonb,
   '2025-03-07T12:00:00Z', '2025-03-10T12:00:00Z'),

  ('TASK-005', 'Building boundary review — B-306',
   'Tech Tower has no survey boundary polygon recorded (demo conflict CONFLICT-002). Plan a boundary extraction run via the AI workspace.',
   'BUILDING', 'B-306', 'HIGH', 'PENDING',
   NULL, NULL, 'ADMIN', 'K. S. Narayana Swamy',
   '2025-03-10T12:00:00Z', NULL,
   '[{"id":"H-1050","timestamp":"2025-03-09T12:00:00Z","actor":"K. S. Narayana Swamy","actorRole":"ADMIN","action":"Task created"}]'::jsonb,
   '2025-03-09T12:00:00Z', '2025-03-10T12:00:00Z'),

  ('TASK-006', 'Verification review — PROP-104-0401',
   'Unit PROP-104-0401 was rejected in the demo queue. Review the officer notes and schedule a re-verification or correction.',
   'PROPERTY', 'PROP-104-0401', 'MEDIUM', 'COMPLETED',
   'usr-off-204', 'Sanjay Verma, IAS', 'OFFICER', 'Dr. Ananya Iyer, IAS',
   '2025-02-28T12:00:00Z', '2025-03-08T12:00:00Z',
   '[{"id":"H-1060","timestamp":"2025-02-28T12:00:00Z","actor":"Dr. Ananya Iyer, IAS","actorRole":"OFFICER","action":"Task created"},{"id":"H-1061","timestamp":"2025-03-08T12:00:00Z","actor":"Sanjay Verma, IAS","actorRole":"OFFICER","action":"Status → COMPLETED","note":"Record corrected and re-submitted."}]'::jsonb,
   '2025-02-28T12:00:00Z', '2025-03-10T12:00:00Z');

commit;
