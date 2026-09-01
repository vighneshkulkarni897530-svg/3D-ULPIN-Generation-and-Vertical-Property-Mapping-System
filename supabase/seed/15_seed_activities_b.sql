-- Seed: Activities Part 2 (ACT-009 to ACT-015) — Phase 13
begin;

insert into activities (id, type, title, description, entity_type, entity_id, timestamp,
  user, user_role, status, metadata, created_at)
values
  ('ACT-009', 'BUILDING_UPDATE', 'Building Status Updated',
   'Building B-306 status changed to UNDER_CONSTRUCTION following foundation inspection.',
   'BUILDING', 'B-306', '2025-03-06T11:00:00Z',
   'Municipal Inspector', 'OFFICER', 'COMPLETED',
   '{"field":"status","oldValue":"ACTIVE","newValue":"UNDER_CONSTRUCTION"}'::jsonb, '2025-03-06T11:00:00Z'),

  ('ACT-010', 'AI_EXTRACTION', '3D Point Cloud Processing Complete',
   'AI extraction pipeline processed drone LiDAR scan for B-102. 10 property units extracted, 92% avg confidence.',
   'BUILDING', 'B-102', '2025-03-01T07:30:00Z',
   'AI Agent', 'AI_AGENT', 'COMPLETED',
   '{"source":"DRONE_SCAN","unitsExtracted":10,"avgConfidence":0.92,"processingTimeSec":142}'::jsonb, '2025-03-01T07:30:00Z'),

  ('ACT-011', 'AI_EXTRACTION', '3D Point Cloud Processing Complete',
   'AI extraction pipeline processed drone LiDAR scan for B-104. 6 property units extracted, 88% avg confidence.',
   'BUILDING', 'B-104', '2025-03-02T07:30:00Z',
   'AI Agent', 'AI_AGENT', 'COMPLETED',
   '{"source":"DRONE_SCAN","unitsExtracted":6,"avgConfidence":0.88,"processingTimeSec":98}'::jsonb, '2025-03-02T07:30:00Z'),

  ('ACT-012', 'AI_EXTRACTION', '3D Point Cloud Processing Complete',
   'AI extraction for B-306. 4 units extracted, 84% avg confidence. Duplicate spatial ID flagged.',
   'BUILDING', 'B-306', '2025-03-03T07:30:00Z',
   'AI Agent', 'AI_AGENT', 'COMPLETED',
   '{"source":"DRONE_SCAN","unitsExtracted":4,"avgConfidence":0.84,"warnings":1}'::jsonb, '2025-03-03T07:30:00Z'),

  ('ACT-013', '3D_RECONSTRUCTION', '3D Digital Twin Reconstructed',
   'Building B-102 digital twin reconstructed. 5 floors, 12 total units.',
   'BUILDING', 'B-102', '2025-03-01T12:00:00Z',
   'AI Agent', 'AI_AGENT', 'COMPLETED',
   '{"floors":5,"totalUnits":12,"source":"DRONE_SCAN","resolution":"2.5cm"}'::jsonb, '2025-03-01T12:00:00Z'),

  ('ACT-014', '3D_RECONSTRUCTION', '3D Digital Twin Reconstructed',
   'Building B-104 digital twin reconstructed. 5 floors, 7 total units.',
   'BUILDING', 'B-104', '2025-03-02T12:00:00Z',
   'AI Agent', 'AI_AGENT', 'COMPLETED',
   '{"floors":5,"totalUnits":7,"source":"DRONE_SCAN","resolution":"2.5cm"}'::jsonb, '2025-03-02T12:00:00Z'),

  ('ACT-015', '3D_RECONSTRUCTION', '3D Digital Twin Reconstructed',
   'Building B-306 digital twin reconstructed. 5 floors, 8 total units.',
   'BUILDING', 'B-306', '2025-03-03T12:00:00Z',
   'AI Agent', 'AI_AGENT', 'COMPLETED',
   '{"floors":5,"totalUnits":8,"source":"DRONE_SCAN","resolution":"2.5cm"}'::jsonb, '2025-03-03T12:00:00Z');

commit;
