-- Seed: Verifications Part 2 (VER-014 to VER-025) — Phase 13
begin;

insert into verifications (id, property_id, previous_status, new_status, verified_by,
  verified_by_role, verification_date, notes, photo_url, gps_matched, boundary_matched,
  confidence_score, method, source, created_at)
values
  ('VER-014', 'PROP-104-0102', 'Initial', 'Pending', 'System', 'SYSTEM',
   '2025-02-28T09:00:00Z', 'Property unit ingested. AI extraction confidence 0.88. Awaiting field verification assignment.', null, true, true, 88, 'AI_EXTRACTION', 'SYSTEM', '2025-02-28T09:00:00Z'),
  ('VER-015', 'PROP-104-0201', 'Initial', 'Pending', 'System', 'SYSTEM',
   '2025-03-01T11:30:00Z', 'Property unit ingested from survey record. Confidence 0.89.', null, true, true, 89, 'TOTAL_STATION', 'SYSTEM', '2025-03-01T11:30:00Z'),
  ('VER-016', 'PROP-104-0301', 'Initial', 'Pending', 'System', 'SYSTEM',
   '2025-03-02T14:00:00Z', 'Property unit ingested. AI extraction confidence 0.86. Commercial — pending zoning cross-check.', null, true, true, 86, 'AI_EXTRACTION', 'SYSTEM', '2025-03-02T14:00:00Z'),
  ('VER-017', 'PROP-104-0401', 'Initial', 'Pending', 'System', 'SYSTEM',
   '2025-02-25T10:00:00Z', 'Property unit ingested. AI extraction confidence 0.65 (low).', null, true, true, 65, 'AI_EXTRACTION', 'SYSTEM', '2025-02-25T10:00:00Z'),
  ('VER-018', 'PROP-104-0401', 'Pending', 'Under Review', 'Dr. Ananya Iyer, IAS', 'OFFICER',
   '2025-03-04T12:15:00Z', 'Owner name mismatch — registered as "Innovate Labs India" but tax records show different name.', null, true, false, 58, 'VISUAL_INSPECTION', 'OFFICER', '2025-03-04T12:15:00Z'),
  ('VER-019', 'PROP-104-0401', 'Under Review', 'Rejected', 'Dr. Ananya Iyer, IAS', 'OFFICER',
   '2025-03-09T16:00:00Z', 'REJECTED — Owner could not be verified. Missing registration documents.', null, true, true, 40, 'VISUAL_INSPECTION', 'OFFICER', '2025-03-09T16:00:00Z'),
  ('VER-020', 'PROP-306-0101', 'Initial', 'Pending', 'System', 'SYSTEM',
   '2025-02-17T09:00:00Z', 'Property unit ingested. AI extraction confidence 0.95. Linked to PropertyItem prop-pun-003.', null, true, true, 95, 'AI_EXTRACTION', 'SYSTEM', '2025-02-17T09:00:00Z'),
  ('VER-021', 'PROP-306-0101', 'Pending', 'Verified', 'Dr. Ananya Iyer, IAS', 'OFFICER',
   '2025-03-04T13:40:00Z', 'Verification complete. RTK GNSS match within 3 cm tolerance.',
   'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&auto=format&fit=crop&q=80',
   true, true, 95, 'RTK_GNSS', 'OFFICER', '2025-03-04T13:40:00Z'),
  ('VER-022', 'PROP-306-0201', 'Initial', 'Pending', 'System', 'SYSTEM',
   '2025-02-20T11:00:00Z', 'Property unit ingested. AI extraction confidence 0.78.', null, true, true, 78, 'AI_EXTRACTION', 'SYSTEM', '2025-02-20T11:00:00Z'),
  ('VER-023', 'PROP-306-0201', 'Pending', 'Field Verification', 'Inspector Sunita Pawar', 'OFFICER',
   '2025-03-06T10:00:00Z', 'Drone scan conducted. Building has Missing Boundary spatial conflict.',
   'https://images.unsplash.com/photo-1577495508048-b635879837f1?w=600&auto=format&fit=crop&q=80',
   false, false, 62, 'DRONE_SCAN', 'OFFICER', '2025-03-06T10:00:00Z'),
  ('VER-024', 'PROP-306-0201', 'Field Verification', 'Reinspection Required', 'Dr. Ananya Iyer, IAS', 'OFFICER',
   '2025-03-07T09:30:00Z', 'Reinspection required — boundary geometry missing from records.', null, false, false, 50, 'DRONE_SCAN', 'OFFICER', '2025-03-07T09:30:00Z'),
  ('VER-025', 'PROP-306-G01', 'Initial', 'Pending', 'System', 'SYSTEM',
   '2025-03-01T08:00:00Z', 'Property unit ingested. Confidence 0.88. Awaiting field verification.', null, true, false, 88, 'TOTAL_STATION', 'SYSTEM', '2025-03-01T08:00:00Z');

commit;
