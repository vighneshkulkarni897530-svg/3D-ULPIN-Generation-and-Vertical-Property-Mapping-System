-- Seed: Property Units — Building B-104 (Phase 13)
-- 6 units across 5 floors in Shree Krishna Arcade (B-104).
begin;

insert into property_units
  (id, property_id, building_id, floor_id, parcel_id, unit_number, demo_spatial_id,
   official_ulpin_reference, property_type, area, latitude, longitude, elevation,
   geometry, owner_reference_name, verification_status, data_source, confidence,
   generated_at, last_updated, created_at, updated_at,
   demo_spatial_id_metadata, official_ulpin_metadata)
values
  ('PROP-104-G01', 'PROP-MH-PUN-SKA-104', 'B-104', 'FLOOR-104-G', 'PARCEL-MH-PUN-002',
   'G-01', '3D-MH-PUN-104-G01', NULL, 'COMMERCIAL', 520, 18.5341, 73.8651, 2.0,
   st_setsrid(st_makepoint(73.8651, 18.5341), 4326), 'Shree Krishna Traders', 'Verified', 'AI_EXTRACTION', 0.93,
   '2025-03-01T08:00:00Z', '2025-03-10T12:00:00Z', '2025-03-01T08:00:00Z', '2025-03-10T12:00:00Z',
   '{"label":"Demo Spatial Identifier","isOfficialUlpin":false,"generatedAt":"2025-03-01T08:00:00Z","algorithmVersion":"3D-ULPIN/v2.4-spatial-hash","confidence":0.93,"note":"Demo spatial ID — NOT an official ULPIN. AI 3D extraction pipeline."}'::jsonb,
   '{"isIntegrated":false,"integrationStatus":"FUTURE","note":"Official ULPIN integration pending government API onboarding."}'::jsonb),

  ('PROP-104-0101', 'PROP-MH-PUN-SKA-104', 'B-104', 'FLOOR-104-1', 'PARCEL-MH-PUN-002',
   '0101', '3D-MH-PUN-104-0101', NULL, 'RESIDENTIAL', 780, 18.5343, 73.8653, 5.5,
   st_setsrid(st_makepoint(73.8653, 18.5343), 4326), 'Ramesh B. Patil', 'Verified', 'DRONE_SCAN', 0.92,
   '2025-03-01T08:00:00Z', '2025-03-10T12:00:00Z', '2025-03-01T08:00:00Z', '2025-03-10T12:00:00Z',
   '{"label":"Demo Spatial Identifier","isOfficialUlpin":false,"generatedAt":"2025-03-01T08:00:00Z","algorithmVersion":"3D-ULPIN/v2.4-spatial-hash","confidence":0.92,"note":"Demo spatial ID — NOT an official ULPIN. AI 3D extraction pipeline."}'::jsonb,
   '{"isIntegrated":false,"integrationStatus":"FUTURE","note":"Official ULPIN integration pending government API onboarding."}'::jsonb),

  ('PROP-104-0102', 'PROP-MH-PUN-SKA-104', 'B-104', 'FLOOR-104-1', 'PARCEL-MH-PUN-002',
   '0102', '3D-MH-PUN-104-0102', NULL, 'RESIDENTIAL', 820, 18.5343, 73.8661, 5.5,
   st_setsrid(st_makepoint(73.8661, 18.5343), 4326), 'Sneha R. K.', 'Pending', 'AI_EXTRACTION', 0.88,
   '2025-03-01T08:00:00Z', '2025-03-10T12:00:00Z', '2025-03-01T08:00:00Z', '2025-03-10T12:00:00Z',
   '{"label":"Demo Spatial Identifier","isOfficialUlpin":false,"generatedAt":"2025-03-01T08:00:00Z","algorithmVersion":"3D-ULPIN/v2.4-spatial-hash","confidence":0.88,"note":"Demo spatial ID — NOT an official ULPIN. AI 3D extraction pipeline."}'::jsonb,
   '{"isIntegrated":false,"integrationStatus":"FUTURE","note":"Official ULPIN integration pending government API onboarding."}'::jsonb),

  ('PROP-104-0201', 'PROP-MH-PUN-SKA-104', 'B-104', 'FLOOR-104-2', 'PARCEL-MH-PUN-002',
   '0201', '3D-MH-PUN-104-0201', NULL, 'RESIDENTIAL', 780, 18.5333, 73.8659, 8.5,
   st_setsrid(st_makepoint(73.8659, 18.5333), 4326), 'Amit Desai', 'Pending', 'SURVEY_RECORD', 0.89,
   '2025-03-01T08:00:00Z', '2025-03-10T12:00:00Z', '2025-03-01T08:00:00Z', '2025-03-10T12:00:00Z',
   '{"label":"Demo Spatial Identifier","isOfficialUlpin":false,"generatedAt":"2025-03-01T08:00:00Z","algorithmVersion":"3D-ULPIN/v2.4-spatial-hash","confidence":0.89,"note":"Demo spatial ID — NOT an official ULPIN. AI 3D extraction pipeline."}'::jsonb,
   '{"isIntegrated":false,"integrationStatus":"FUTURE","note":"Official ULPIN integration pending government API onboarding."}'::jsonb),

  ('PROP-104-0301', 'PROP-MH-PUN-SKA-104', 'B-104', 'FLOOR-104-3', 'PARCEL-MH-PUN-002',
   '0301', '3D-MH-PUN-104-0301', NULL, 'COMMERCIAL', 650, 18.5346, 73.8657, 11.5,
   st_setsrid(st_makepoint(73.8657, 18.5346), 4326), 'Global Tech Solutions Pvt Ltd', 'Pending', 'AI_EXTRACTION', 0.86,
   '2025-03-01T08:00:00Z', '2025-03-10T12:00:00Z', '2025-03-01T08:00:00Z', '2025-03-10T12:00:00Z',
   '{"label":"Demo Spatial Identifier","isOfficialUlpin":false,"generatedAt":"2025-03-01T08:00:00Z","algorithmVersion":"3D-ULPIN/v2.4-spatial-hash","confidence":0.86,"note":"Demo spatial ID — NOT an official ULPIN. AI 3D extraction pipeline."}'::jsonb,
   '{"isIntegrated":false,"integrationStatus":"FUTURE","note":"Official ULPIN integration pending government API onboarding."}'::jsonb),

  ('PROP-104-0401', 'PROP-MH-PUN-SKA-104', 'B-104', 'FLOOR-104-4', 'PARCEL-MH-PUN-002',
   '0401', '3D-MH-PUN-104-0401', NULL, 'COMMERCIAL', 650, 18.5328, 73.8647, 14.5,
   st_setsrid(st_makepoint(73.8647, 18.5328), 4326), 'Innovate Labs India', 'Rejected', 'AI_EXTRACTION', 0.65,
   '2025-03-01T08:00:00Z', '2025-03-10T12:00:00Z', '2025-03-01T08:00:00Z', '2025-03-10T12:00:00Z',
   '{"label":"Demo Spatial Identifier","isOfficialUlpin":false,"generatedAt":"2025-03-01T08:00:00Z","algorithmVersion":"3D-ULPIN/v2.4-spatial-hash","confidence":0.65,"note":"Demo spatial ID — NOT an official ULPIN. AI 3D extraction pipeline."}'::jsonb,
   '{"isIntegrated":false,"integrationStatus":"FUTURE","note":"Official ULPIN integration pending government API onboarding."}'::jsonb);

commit;
