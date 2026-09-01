-- Seed: Property Units — Building B-102 (Floors 2-4) — Phase 13
begin;

insert into property_units
  (id, property_id, building_id, floor_id, parcel_id, unit_number, demo_spatial_id,
   official_ulpin_reference, property_type, area, latitude, longitude, elevation,
   geometry, owner_reference_name, verification_status, data_source, confidence,
   generated_at, last_updated, created_at, updated_at,
   demo_spatial_id_metadata, official_ulpin_metadata)
values
  ('PROP-102-0201', 'PROP-MH-PUN-GVR-102', 'B-102', 'FLOOR-102-2', 'PARCEL-MH-PUN-001',
   '0201', '3D-MH-PUN-102-0201', NULL, 'RESIDENTIAL', 1050, 18.5312, 73.8534, 9.5,
   st_setsrid(st_makepoint(73.8534, 18.5312), 4326), 'Venkat Rao Deshmukh', 'Verified', 'DRONE_SCAN', 0.94,
   '2025-03-01T08:00:00Z', '2025-03-10T12:00:00Z', '2025-03-01T08:00:00Z', '2025-03-10T12:00:00Z',
   '{"label":"Demo Spatial Identifier","isOfficialUlpin":false,"generatedAt":"2025-03-01T08:00:00Z","algorithmVersion":"3D-ULPIN/v2.4-spatial-hash","confidence":0.94,"note":"Demo spatial ID — NOT an official ULPIN. AI 3D extraction pipeline."}'::jsonb,
   '{"isIntegrated":false,"integrationStatus":"FUTURE","note":"Official ULPIN integration pending government API onboarding."}'::jsonb),

  ('PROP-102-0202', 'PROP-MH-PUN-GVR-102', 'B-102', 'FLOOR-102-2', 'PARCEL-MH-PUN-001',
   '0202', '3D-MH-PUN-102-0202', NULL, 'RESIDENTIAL', 850, 18.5312, 73.8548, 9.5,
   st_setsrid(st_makepoint(73.8548, 18.5312), 4326), 'Farah Ansari', 'Under Review', 'AI_EXTRACTION', 0.85,
   '2025-03-01T08:00:00Z', '2025-03-10T12:00:00Z', '2025-03-01T08:00:00Z', '2025-03-10T12:00:00Z',
   '{"label":"Demo Spatial Identifier","isOfficialUlpin":false,"generatedAt":"2025-03-01T08:00:00Z","algorithmVersion":"3D-ULPIN/v2.4-spatial-hash","confidence":0.85,"note":"Demo spatial ID — NOT an official ULPIN. AI 3D extraction pipeline."}'::jsonb,
   '{"isIntegrated":false,"integrationStatus":"FUTURE","note":"Official ULPIN integration pending government API onboarding."}'::jsonb),

  ('PROP-102-0301', 'PROP-MH-PUN-GVR-102', 'B-102', 'FLOOR-102-3', 'PARCEL-MH-PUN-001',
   '0301', '3D-MH-PUN-102-0301', NULL, 'RESIDENTIAL', 1050, 18.5338, 73.8536, 13.0,
   st_setsrid(st_makepoint(73.8536, 18.5338), 4326), 'Karthik Subramaniam', 'Verified', 'AI_EXTRACTION', 0.96,
   '2025-03-01T08:00:00Z', '2025-03-10T12:00:00Z', '2025-03-01T08:00:00Z', '2025-03-10T12:00:00Z',
   '{"label":"Demo Spatial Identifier","isOfficialUlpin":false,"generatedAt":"2025-03-01T08:00:00Z","algorithmVersion":"3D-ULPIN/v2.4-spatial-hash","confidence":0.96,"note":"Demo spatial ID — NOT an official ULPIN. AI 3D extraction pipeline."}'::jsonb,
   '{"isIntegrated":false,"integrationStatus":"FUTURE","note":"Official ULPIN integration pending government API onboarding."}'::jsonb),

  ('PROP-102-0302', 'PROP-MH-PUN-GVR-102', 'B-102', 'FLOOR-102-3', 'PARCEL-MH-PUN-001',
   '0302', '3D-MH-PUN-102-0302', NULL, 'RESIDENTIAL', 850, 18.5338, 73.8551, 13.0,
   st_setsrid(st_makepoint(73.8551, 18.5338), 4326), 'Sunita V. Deshpande', 'Under Review', 'SURVEY_RECORD', 0.87,
   '2025-03-01T08:00:00Z', '2025-03-10T12:00:00Z', '2025-03-01T08:00:00Z', '2025-03-10T12:00:00Z',
   '{"label":"Demo Spatial Identifier","isOfficialUlpin":false,"generatedAt":"2025-03-01T08:00:00Z","algorithmVersion":"3D-ULPIN/v2.4-spatial-hash","confidence":0.87,"note":"Demo spatial ID — NOT an official ULPIN. AI 3D extraction pipeline."}'::jsonb,
   '{"isIntegrated":false,"integrationStatus":"FUTURE","note":"Official ULPIN integration pending government API onboarding."}'::jsonb),

  ('PROP-102-0401', 'PROP-MH-PUN-GVR-102', 'B-102', 'FLOOR-102-4', 'PARCEL-MH-PUN-001',
   '0401', '3D-MH-PUN-102-0401', NULL, 'RESIDENTIAL', 850, 18.5304, 73.8549, 16.5,
   st_setsrid(st_makepoint(73.8549, 18.5304), 4326), 'Mahesh K. Joshi', 'Reinspection Required', 'AI_EXTRACTION', 0.72,
   '2025-03-01T08:00:00Z', '2025-03-10T12:00:00Z', '2025-03-01T08:00:00Z', '2025-03-10T12:00:00Z',
   '{"label":"Demo Spatial Identifier","isOfficialUlpin":false,"generatedAt":"2025-03-01T08:00:00Z","algorithmVersion":"3D-ULPIN/v2.4-spatial-hash","confidence":0.72,"note":"Demo spatial ID — NOT an official ULPIN. AI 3D extraction pipeline."}'::jsonb,
   '{"isIntegrated":false,"integrationStatus":"FUTURE","note":"Official ULPIN integration pending government API onboarding."}'::jsonb);

commit;
