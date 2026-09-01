-- Seed: Property Units — Building B-102 (Floor G & 1) — Phase 13
begin;

insert into property_units
  (id, property_id, building_id, floor_id, parcel_id, unit_number, demo_spatial_id,
   official_ulpin_reference, property_type, area, latitude, longitude, elevation,
   geometry, owner_reference_name, verification_status, data_source, confidence,
   generated_at, last_updated, created_at, updated_at,
   demo_spatial_id_metadata, official_ulpin_metadata)
values
  ('PROP-102-G01', 'PROP-MH-PUN-GVR-102', 'B-102', 'FLOOR-102-G', 'PARCEL-MH-PUN-001',
   'G-01', '3D-MH-PUN-102-G01', NULL, 'RESIDENTIAL', 650, 18.5326, 73.8527, 2.5,
   st_setsrid(st_makepoint(73.8527, 18.5326), 4326), 'Rajesh V. Sharma', 'Verified', 'AI_EXTRACTION', 0.96,
   '2025-03-01T08:00:00Z', '2025-03-10T12:00:00Z', '2025-03-01T08:00:00Z', '2025-03-10T12:00:00Z',
   '{"label":"Demo Spatial Identifier","isOfficialUlpin":false,"generatedAt":"2025-03-01T08:00:00Z","algorithmVersion":"3D-ULPIN/v2.4-spatial-hash","confidence":0.96,"note":"Demo spatial ID — NOT an official ULPIN. AI 3D extraction pipeline."}'::jsonb,
   '{"isIntegrated":false,"integrationStatus":"FUTURE","note":"Official ULPIN integration pending government API onboarding."}'::jsonb),

  ('PROP-102-G02', 'PROP-MH-PUN-GVR-102', 'B-102', 'FLOOR-102-G', 'PARCEL-MH-PUN-001',
   'G-02', '3D-MH-PUN-102-G02', NULL, 'COMMERCIAL', 420, 18.5326, 73.8547, 2.5,
   st_setsrid(st_makepoint(73.8547, 18.5326), 4326), 'Apex Banking Corp', 'Pending', 'SURVEY_RECORD', 0.91,
   '2025-03-01T08:00:00Z', '2025-03-10T12:00:00Z', '2025-03-01T08:00:00Z', '2025-03-10T12:00:00Z',
   '{"label":"Demo Spatial Identifier","isOfficialUlpin":false,"generatedAt":"2025-03-01T08:00:00Z","algorithmVersion":"3D-ULPIN/v2.4-spatial-hash","confidence":0.91,"note":"Demo spatial ID — NOT an official ULPIN. AI 3D extraction pipeline."}'::jsonb,
   '{"isIntegrated":false,"integrationStatus":"FUTURE","note":"Official ULPIN integration pending government API onboarding."}'::jsonb),

  ('PROP-102-0101', 'PROP-MH-PUN-GVR-102', 'B-102', 'FLOOR-102-1', 'PARCEL-MH-PUN-001',
   '0101', '3D-MH-PUN-102-0101', NULL, 'RESIDENTIAL', 850, 18.5330, 73.8531, 6.0,
   st_setsrid(st_makepoint(73.8531, 18.5330), 4326), 'Priya R. Kulkarni', 'Verified', 'AI_EXTRACTION', 0.95,
   '2025-03-01T08:00:00Z', '2025-03-10T12:00:00Z', '2025-03-01T08:00:00Z', '2025-03-10T12:00:00Z',
   '{"label":"Demo Spatial Identifier","isOfficialUlpin":false,"generatedAt":"2025-03-01T08:00:00Z","algorithmVersion":"3D-ULPIN/v2.4-spatial-hash","confidence":0.95,"note":"Demo spatial ID — NOT an official ULPIN. AI 3D extraction pipeline."}'::jsonb,
   '{"isIntegrated":false,"integrationStatus":"FUTURE","note":"Official ULPIN integration pending government API onboarding."}'::jsonb),

  ('PROP-102-0102', 'PROP-MH-PUN-GVR-102', 'B-102', 'FLOOR-102-1', 'PARCEL-MH-PUN-001',
   '0102', '3D-MH-PUN-102-0102', NULL, 'RESIDENTIAL', 1050, 18.5330, 73.8543, 6.0,
   st_setsrid(st_makepoint(73.8543, 18.5330), 4326), 'Arjun Mehta', 'Verified', 'DRONE_SCAN', 0.97,
   '2025-03-01T08:00:00Z', '2025-03-10T12:00:00Z', '2025-03-01T08:00:00Z', '2025-03-10T12:00:00Z',
   '{"label":"Demo Spatial Identifier","isOfficialUlpin":false,"generatedAt":"2025-03-01T08:00:00Z","algorithmVersion":"3D-ULPIN/v2.4-spatial-hash","confidence":0.97,"note":"Demo spatial ID — NOT an official ULPIN. AI 3D extraction pipeline."}'::jsonb,
   '{"isIntegrated":false,"integrationStatus":"FUTURE","note":"Official ULPIN integration pending government API onboarding."}'::jsonb),

  ('PROP-102-0103', 'PROP-MH-PUN-GVR-102', 'B-102', 'FLOOR-102-1', 'PARCEL-MH-PUN-001',
   '0103', '3D-MH-PUN-102-0103', NULL, 'RESIDENTIAL', 850, 18.5330, 73.8555, 6.0,
   st_setsrid(st_makepoint(73.8555, 18.5330), 4326), 'Neha Verma', 'Under Review', 'AI_EXTRACTION', 0.88,
   '2025-03-01T08:00:00Z', '2025-03-10T12:00:00Z', '2025-03-01T08:00:00Z', '2025-03-10T12:00:00Z',
   '{"label":"Demo Spatial Identifier","isOfficialUlpin":false,"generatedAt":"2025-03-01T08:00:00Z","algorithmVersion":"3D-ULPIN/v2.4-spatial-hash","confidence":0.88,"note":"Demo spatial ID — NOT an official ULPIN. AI 3D extraction pipeline."}'::jsonb,
   '{"isIntegrated":false,"integrationStatus":"FUTURE","note":"Official ULPIN integration pending government API onboarding."}'::jsonb);

commit;
