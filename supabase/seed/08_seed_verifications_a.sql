-- Seed: Verifications Part 1 (VER-001 to VER-013) — Phase 13
begin;

insert into verifications (id, property_id, previous_status, new_status, verified_by,
  verified_by_role, verification_date, notes, photo_url, gps_matched, boundary_matched,
  confidence_score, method, source, created_at)
values
  ('VER-001', 'PROP-102-G01', 'Initial', 'Pending', 'System', 'SYSTEM',
   '2025-02-15T09:30:00Z', 'Property unit ingested into 3D cadastre registry. Demo spatial ID 3D-MH-PUN-102-G01 generated.', null, true, true, 88, 'AI_EXTRACTION', 'SYSTEM', '2025-02-15T09:30:00Z'),
  ('VER-002', 'PROP-102-G01', 'Pending', 'Verified', 'Dr. Ananya Iyer, IAS', 'OFFICER',
   '2025-03-05T14:22:00Z', 'RTK GNSS survey confirmed boundary within 5 cm tolerance. Owner KYC verified.',
   'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=600&auto=format&fit=crop&q=80',
   true, true, 96, 'RTK_GNSS', 'OFFICER', '2025-03-05T14:22:00Z'),
  ('VER-003', 'PROP-102-0101', 'Pending', 'Under Review', 'Dr. Ananya Iyer, IAS', 'OFFICER',
   '2025-02-20T10:15:00Z', 'Desk audit complete. Title deed cross-referenced with Bhoomi records.', null, true, false, 82, 'VISUAL_INSPECTION', 'OFFICER', '2025-02-20T10:15:00Z'),
  ('VER-004', 'PROP-102-0101', 'Under Review', 'Verified', 'Dr. Ananya Iyer, IAS', 'OFFICER',
   '2025-03-08T16:45:00Z', 'Field verification complete. Total station survey confirmed unit boundary.',
   'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&auto=format&fit=crop&q=80',
   true, true, 95, 'TOTAL_STATION', 'OFFICER', '2025-03-08T16:45:00Z'),
  ('VER-005', 'PROP-102-0103', 'Initial', 'Pending', 'System', 'SYSTEM',
   '2025-02-18T11:00:00Z', 'Property unit ingested. AI 3D extraction confidence 0.88.', null, true, true, 88, 'AI_EXTRACTION', 'SYSTEM', '2025-02-18T11:00:00Z'),
  ('VER-006', 'PROP-102-0103', 'Pending', 'Under Review', 'Dr. Ananya Iyer, IAS', 'OFFICER',
   '2025-03-02T13:30:00Z', 'Owner name discrepancy detected. Cross-referencing with mutation records.', null, true, false, 72, 'VISUAL_INSPECTION', 'OFFICER', '2025-03-02T13:30:00Z'),
  ('VER-007', 'PROP-102-0202', 'Initial', 'Pending', 'System', 'SYSTEM',
   '2025-02-15T09:45:00Z', 'Property unit ingested. AI extraction confidence 0.85.', null, true, true, 85, 'AI_EXTRACTION', 'SYSTEM', '2025-02-15T09:45:00Z'),
  ('VER-008', 'PROP-102-0202', 'Pending', 'Under Review', 'Dr. Ananya Iyer, IAS', 'OFFICER',
   '2025-03-10T09:00:00Z', 'Boundary overlap conflict detected with adjacent parcel. Under investigation.', null, true, false, 65, 'TOTAL_STATION', 'OFFICER', '2025-03-10T09:00:00Z'),
  ('VER-009', 'PROP-102-0401', 'Initial', 'Pending', 'System', 'SYSTEM',
   '2025-02-22T08:10:00Z', 'Property unit ingested. AI extraction confidence 0.72 (low).', null, true, true, 72, 'AI_EXTRACTION', 'SYSTEM', '2025-02-22T08:10:00Z'),
  ('VER-010', 'PROP-102-0401', 'Pending', 'Field Verification', 'Inspector Sunita Pawar', 'OFFICER',
   '2025-03-03T15:00:00Z', 'Field inspection conducted. Owner name requires reconfirmation.',
   'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&auto=format&fit=crop&q=80',
   false, true, 68, 'VISUAL_INSPECTION', 'OFFICER', '2025-03-03T15:00:00Z'),
  ('VER-011', 'PROP-102-0401', 'Field Verification', 'Reinspection Required', 'Dr. Ananya Iyer, IAS', 'OFFICER',
   '2025-03-03T17:30:00Z', 'Reinspection required — owner details could not be confirmed.', null, false, false, 55, 'VISUAL_INSPECTION', 'OFFICER', '2025-03-03T17:30:00Z'),
  ('VER-012', 'PROP-104-0101', 'Initial', 'Pending', 'System', 'SYSTEM',
   '2025-02-19T10:30:00Z', 'Property unit ingested. AI extraction confidence 0.92.', null, true, true, 92, 'AI_EXTRACTION', 'SYSTEM', '2025-02-19T10:30:00Z'),
  ('VER-013', 'PROP-104-0101', 'Pending', 'Verified', 'Dr. Ananya Iyer, IAS', 'OFFICER',
   '2025-03-06T11:20:00Z', 'Verification complete. Drone LiDAR scan confirmed unit geometry. Owner KYC matched.',
   'https://images.unsplash.com/photo-1577495508048-b635879837f1?w=600&auto=format&fit=crop&q=80',
   true, true, 92, 'DRONE_SCAN', 'OFFICER', '2025-03-06T11:20:00Z');

commit;
