-- Seed: Activities Part 1 (ACT-001 to ACT-008) — Phase 13
begin;

insert into activities (id, type, title, description, entity_type, entity_id, timestamp,
  user, user_role, status, metadata, created_at)
values
  ('ACT-001', 'PROPERTY_VERIFICATION', 'Property Verified',
   'PROP-102-G01 (Green View Residency) verified via RTK GNSS. Confidence: 96%. Bhu-Aadhaar seal issued.',
   'PROPERTY', 'PROP-102-G01', '2025-03-05T14:22:00Z',
   'Dr. Ananya Iyer, IAS', 'OFFICER', 'COMPLETED',
   '{"method":"RTK_GNSS","confidence":96}'::jsonb, '2025-03-05T14:22:00Z'),

  ('ACT-002', 'PROPERTY_VERIFICATION', 'Property Verified',
   'PROP-102-0101 verified via Total Station survey. Boundary confirmed.',
   'PROPERTY', 'PROP-102-0101', '2025-03-08T16:45:00Z',
   'Dr. Ananya Iyer, IAS', 'OFFICER', 'COMPLETED',
   '{"method":"TOTAL_STATION","confidence":95}'::jsonb, '2025-03-08T16:45:00Z'),

  ('ACT-003', 'PROPERTY_VERIFICATION', 'Property Verified',
   'PROP-306-0101 verified via RTK GNSS. Linked to existing PropertyItem prop-pun-003.',
   'PROPERTY', 'PROP-306-0101', '2025-03-04T13:40:00Z',
   'Dr. Ananya Iyer, IAS', 'OFFICER', 'COMPLETED',
   '{"method":"RTK_GNSS","confidence":95,"linkedPropertyId":"prop-pun-003"}'::jsonb, '2025-03-04T13:40:00Z'),

  ('ACT-004', 'CONFLICT_DETECTION', 'Boundary Overlap Detected',
   'CON-2025-001: Boundary overlap between parcels PARCEL-MH-PUN-001 and PARCEL-MH-PUN-002. Severity: Critical.',
   'CONFLICT', 'CONFLICT-001', '2025-03-10T06:45:00Z',
   'System', 'SYSTEM', 'COMPLETED',
   '{"conflictType":"Boundary Overlap","severity":"Critical","parcelCount":2}'::jsonb, '2025-03-10T06:45:00Z'),

  ('ACT-005', 'CONFLICT_DETECTION', 'Missing Boundary Detected',
   'CON-2025-002: Building B-306 has no survey boundary polygon recorded.',
   'CONFLICT', 'CONFLICT-002', '2025-03-08T14:20:00Z',
   'System', 'SYSTEM', 'COMPLETED',
   '{"conflictType":"Missing Boundary","severity":"High","affectedUnits":4}'::jsonb, '2025-03-08T14:20:00Z'),

  ('ACT-006', 'CONFLICT_DETECTION', 'Duplicate Spatial ID Detected',
   'CON-2025-003: Demo spatial ID collision between PROP-102-0101 and PROP-306-0101.',
   'CONFLICT', 'CONFLICT-003', '2025-03-09T11:10:00Z',
   'AI Agent', 'AI_AGENT', 'COMPLETED',
   '{"conflictType":"Duplicate Spatial ID","severity":"Medium","affectedUnits":2}'::jsonb, '2025-03-09T11:10:00Z'),

  ('ACT-007', 'CONFLICT_RESOLUTION', 'Conflict Resolved',
   'Boundary overlap CONFLICT-001 resolved after resurvey. New boundary marker installed.',
   'CONFLICT', 'CONFLICT-001', '2025-03-11T10:30:00Z',
   'Inspector Sunita Pawar', 'OFFICER', 'COMPLETED',
   '{"method":"RTK_GNSS","newBoundaryMarker":true,"reverifiedUnits":2}'::jsonb, '2025-03-11T10:30:00Z'),

  ('ACT-008', 'DATA_UPDATE', 'Parcel Data Updated',
   'Parcel PARCEL-MH-PUN-004 status changed from ACTIVE to DISPUTED.',
   'PARCEL', 'PARCEL-MH-PUN-004', '2025-03-09T15:40:00Z',
   'System', 'SYSTEM', 'COMPLETED',
   '{"field":"status","oldValue":"ACTIVE","newValue":"DISPUTED"}'::jsonb, '2025-03-09T15:40:00Z');

commit;
