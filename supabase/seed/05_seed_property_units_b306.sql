-- Seed: Property Units — Building B-306 (Phase 13)
-- 4 units across 4 floors in Tech Tower (B-306). propertyId links to PropertyItem.
begin;

insert into property_units
  (id, property_id, building_id, floor_id, parcel_id, unit_number, demo_spatial_id,
   official_ulpin_reference, property_type, area, latitude, longitude, elevation,
   geometry, owner_reference_name, verification_status, data_source, confidence,
   generated_at, last_updated, created_at, updated_at,
   demo_spatial_id_metadata, official_ulpin_metadata)
values
  ('PROP-306-G01', 'prop-pun-003', 'B-306', 'FLOOR-306-G', 'PARCEL-MH-PUN-003',
   'G-01', '3D-MH-PUN-306-G01', NULL, 'COMMERCIAL', 480, 18.5685, 73.7744, 2.5,
   st_setsrid(st_makepoint(73.7744, 18.5685), 4326), 'Cafe Bahar Owner', 'Pending', 'SURVEY_RECORD', 0.88,
   '2025-03-01T08:00:00Z', '2025-03-10T12:00:00Z', '2025-03-01T08:00:00Z', '2025-03-10T12:00:00Z',
   '{"label":"Demo Spatial Identifier","isOfficialUlpin":false,"generatedAt":"2025-03-01T08:00:00Z","algorithmVersion":"3D-ULPIN/v2.4-spatial-hash","confidence":0.88,"note":"Demo spatial ID — NOT an official ULPIN. AI 3D extraction pipeline."}'::jsonb,
   '{"isIntegrated":false,"integrationStatus":"FUTURE","note":"Official ULPIN integration pending government API onboarding."}'::jsonb),

  ('PROP-306-0101', 'prop-pun-003', 'B-306', 'FLOOR-306-1', 'PARCEL-MH-PUN-003',
   '0101', '3D-MH-PUN-306-0101', NULL, 'COMMERCIAL', 1200, 18.5687, 73.7747, 6.0,
   st_setsrid(st_makepoint(73.7747, 18.5687), 4326), 'TCS Ltd', 'Verified', 'AI_EXTRACTION', 0.95,
   '2025-03-01T08:00:00Z', '2025-03-10T12:00:00Z', '2025-03-01T08:00:00Z', '2025-03-10T12:00:00Z',
   '{"label":"Demo Spatial Identifier","isOfficialUlpin":false,"generatedAt":"2025-03-01T08:00:00Z","algorithmVersion":"3D-ULPIN/v2.4-spatial-hash","confidence":0.95,"note":"Demo spatial ID — NOT an official ULPIN. AI 3D extraction pipeline."}'::jsonb,
   '{"isIntegrated":false,"integrationStatus":"FUTURE","note":"Official ULPIN integration pending government API onboarding."}'::jsonb),

  ('PROP-306-0201', 'prop-pun-003', 'B-306', 'FLOOR-306-2', 'PARCEL-MH-PUN-003',
   '0201', '3D-MH-PUN-306-0201', NULL, 'COMMERCIAL', 950, 18.5691, 73.7754, 10.0,
   st_setsrid(st_makepoint(73.7754, 18.5691), 4326), 'WIPRO Ltd', 'Reinspection Required', 'DRONE_SCAN', 0.78,
   '2025-03-01T08:00:00Z', '2025-03-10T12:00:00Z', '2025-03-01T08:00:00Z', '2025-03-10T12:00:00Z',
   '{"label":"Demo Spatial Identifier","isOfficialUlpin":false,"generatedAt":"2025-03-01T08:00:00Z","algorithmVersion":"3D-ULPIN/v2.4-spatial-hash","confidence":0.78,"note":"Demo spatial ID — NOT an official ULPIN. AI 3D extraction pipeline."}'::jsonb,
   '{"isIntegrated":false,"integrationStatus":"FUTURE","note":"Official ULPIN integration pending government API onboarding."}'::jsonb),

  ('PROP-306-0301', 'prop-pun-003', 'B-306', 'FLOOR-306-3', 'PARCEL-MH-PUN-003',
   '0301', '3D-MH-PUN-306-0301', NULL, 'COMMERCIAL', 950, 18.5675, 73.7757, 14.0,
   st_setsrid(st_makepoint(73.7757, 18.5675), 4326), 'TechStart Innovations', 'Pending', 'AI_EXTRACTION', 0.85,
   '2025-03-01T08:00:00Z', '2025-03-10T12:00:00Z', '2025-03-01T08:00:00Z', '2025-03-10T12:00:00Z',
   '{"label":"Demo Spatial Identifier","isOfficialUlpin":false,"generatedAt":"2025-03-01T08:00:00Z","algorithmVersion":"3D-ULPIN/v2.4-spatial-hash","confidence":0.85,"note":"Demo spatial ID — NOT an official ULPIN. AI 3D extraction pipeline."}'::jsonb,
   '{"isIntegrated":false,"integrationStatus":"FUTURE","note":"Official ULPIN integration pending government API onboarding."}'::jsonb);

commit;
