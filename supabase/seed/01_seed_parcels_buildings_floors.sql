-- ─────────────────────────────────────────────────────────────────────────────
-- Seed: Parcels, Buildings, Floors (Phase 13)
-- ─────────────────────────────────────────────────────────────────────────────
-- Five Pune cadastral parcels, three buildings, fifteen floors.
-- ─────────────────────────────────────────────────────────────────────────────

begin;

-- Parcels
insert into parcels (id, parcel_number, location, district, state, area, geometry, centroid_lat, centroid_lng, latitude, longitude, status, created_at, updated_at)
values
  ('PARCEL-MH-PUN-001', 'MH-PUN-SUR-042/B', 'Shivaji Nagar, North Main Road', 'Pune', 'Maharashtra', 8500,
   st_geomfromgeojson('{"type":"Polygon","coordinates":[[73.8530,18.5310],[73.8548,18.5310],[73.8548,18.5325],[73.8530,18.5325],[73.8530,18.5310]]}'),
   18.5318, 73.8539, 18.5318, 73.8539, 'ACTIVE', '2023-01-15T00:00:00Z', '2024-03-10T08:30:00Z'),
  ('PARCEL-MH-PUN-002', 'MH-PUN-SUR-088/A', 'Koregaon Park, Lane 27', 'Pune', 'Maharashtra', 6200,
   st_geomfromgeojson('{"type":"Polygon","coordinates":[[73.8650,18.5330],[73.8665,18.5330],[73.8665,18.5342],[73.8650,18.5342],[73.8650,18.5330]]}'),
   18.5336, 73.8657, 18.5336, 73.8657, 'ACTIVE', '2023-02-20T00:00:00Z', '2024-02-28T14:45:00Z'),
  ('PARCEL-MH-PUN-003', 'MH-PUN-SUR-048/A', 'Baner-Pashan Link Road, Survey 48/A', 'Pune', 'Maharashtra', 12000,
   st_geomfromgeojson('{"type":"Polygon","coordinates":[[73.7740,18.5670],[73.7758,18.5670],[73.7758,18.5688],[73.7740,18.5688],[73.7740,18.5670]]}'),
   18.5679, 73.7749, 18.5679, 73.7749, 'ACTIVE', '2022-11-05T00:00:00Z', '2024-03-01T10:15:00Z'),
  ('PARCEL-MH-PUN-004', 'MH-PUN-SUR-096', 'Wakad, Pimple Saudagar Sector 26', 'Pune', 'Maharashtra', 9800,
   st_geomfromgeojson('{"type":"Polygon","coordinates":[[73.7600,18.5900],[73.7618,18.5900],[73.7618,18.5915],[73.7600,18.5915],[73.7600,18.5900]]}'),
   18.5908, 73.7609, 18.5908, 73.7609, 'DISPUTED', '2023-04-12T00:00:00Z', '2024-03-05T16:20:00Z'),
  ('PARCEL-MH-PUN-005', 'MH-PUN-SUR-017/B', 'Hinjewadi, Phase 3, Rajiv Gandhi Infotech Park', 'Pune', 'Maharashtra', 15000,
   st_geomfromgeojson('{"type":"Polygon","coordinates":[[73.7030,18.5910],[73.7050,18.5910],[73.7050,18.5925],[73.7030,18.5925],[73.7030,18.5910]]}'),
   18.5918, 73.7040, 18.5918, 73.7040, 'ACTIVE', '2023-06-30T00:00:00Z', '2024-03-08T09:10:00Z');

-- Buildings
insert into buildings (id, building_code, name, parcel_id, address, latitude, longitude, height, total_floors, built_up_area, year_built, geometry, status, created_at, updated_at)
values
  ('B-102', 'BLDG-MH-PUN-102', 'Green View Residency', 'PARCEL-MH-PUN-001',
   'Plot 42/B, North Main Road, Shivaji Nagar, Pune, Maharashtra 411005',
   18.5318, 73.8539, 18, 5, 35200, 2020,
   st_geomfromgeojson('{"type":"Polygon","coordinates":[[73.8535,18.5314],[73.8543,18.5314],[73.8543,18.5322],[73.8535,18.5322],[73.8535,18.5314]]}'),
   'ACTIVE', '2020-01-01T00:00:00Z', '2024-03-01T00:00:00Z'),
  ('B-104', 'BLDG-MH-PUN-104', 'Shree Krishna Arcade', 'PARCEL-MH-PUN-002',
   'Plot 88/A, Koregaon Park, Lane 27, Pune, Maharashtra 411001',
   18.5336, 73.8657, 16, 5, 27800, 2018,
   st_geomfromgeojson('{"type":"Polygon","coordinates":[[73.8652,18.5331],[73.8662,18.5331],[73.8662,18.5340],[73.8652,18.5340],[73.8652,18.5331]]}'),
   'ACTIVE', '2018-01-01T00:00:00Z', '2024-03-01T00:00:00Z'),
  ('B-306', 'BLDG-MH-PUN-306', 'Tech Tower', 'PARCEL-MH-PUN-003',
   'Survey 48/A, Baner-Pashan Link Road, Pune, Maharashtra 411045',
   18.5679, 73.7749, 20, 5, 40000, 2021,
   st_geomfromgeojson('{"type":"Polygon","coordinates":[[73.7742,18.5672],[73.7755,18.5672],[73.7755,18.5684],[73.7742,18.5684],[73.7742,18.5672]]}'),
   'UNDER_CONSTRUCTION', '2021-01-01T00:00:00Z', '2024-03-01T00:00:00Z');

-- Floors
insert into floors (id, building_id, floor_number, name, elevation, area, total_units, created_at, updated_at)
values
  ('FLOOR-102-G', 'B-102', 0, 'Ground Floor - Retail & Lobby', 0, 6200, 3, '2020-01-01T00:00:00Z', '2024-03-01T00:00:00Z'),
  ('FLOOR-102-1', 'B-102', 1, '1st Floor - Residential', 3.5, 6800, 3, '2020-01-01T00:00:00Z', '2024-03-01T00:00:00Z'),
  ('FLOOR-102-2', 'B-102', 2, '2nd Floor - Residential', 6.8, 6800, 2, '2020-01-01T00:00:00Z', '2024-03-01T00:00:00Z'),
  ('FLOOR-102-3', 'B-102', 3, '3rd Floor - Residential', 10.2, 6000, 2, '2020-01-01T00:00:00Z', '2024-03-01T00:00:00Z'),
  ('FLOOR-102-4', 'B-102', 4, '4th Floor - Residential', 13.6, 4600, 2, '2020-01-01T00:00:00Z', '2024-03-01T00:00:00Z'),
  ('FLOOR-104-G', 'B-104', 0, 'Ground Floor - Retail & Lobby', 0, 5200, 2, '2018-01-01T00:00:00Z', '2024-03-01T00:00:00Z'),
  ('FLOOR-104-1', 'B-104', 1, '1st Floor - Residential', 3.2, 5100, 2, '2018-01-01T00:00:00Z', '2024-03-01T00:00:00Z'),
  ('FLOOR-104-2', 'B-104', 2, '2nd Floor - Residential', 6.4, 5100, 1, '2018-01-01T00:00:00Z', '2024-03-01T00:00:00Z'),
  ('FLOOR-104-3', 'B-104', 3, '3rd Floor - Office Suite', 9.6, 4800, 1, '2018-01-01T00:00:00Z', '2024-03-01T00:00:00Z'),
  ('FLOOR-104-4', 'B-104', 4, '4th Floor - Office Suites', 12.8, 4800, 1, '2018-01-01T00:00:00Z', '2024-03-01T00:00:00Z'),
  ('FLOOR-306-G', 'B-306', 0, 'Ground Floor - Retail & Lobby', 0, 7200, 2, '2021-01-01T00:00:00Z', '2024-03-01T00:00:00Z'),
  ('FLOOR-306-1', 'B-306', 1, '1st Floor - Office Suites', 3.8, 8200, 2, '2021-01-01T00:00:00Z', '2024-03-01T00:00:00Z'),
  ('FLOOR-306-2', 'B-306', 2, '2nd Floor - Office Suites', 7.6, 8200, 1, '2021-01-01T00:00:00Z', '2024-03-01T00:00:00Z'),
  ('FLOOR-306-3', 'B-306', 3, '3rd Floor - Office Suites', 11.4, 8200, 1, '2021-01-01T00:00:00Z', '2024-03-01T00:00:00Z'),
  ('FLOOR-306-4', 'B-306', 4, '4th Floor - Office Suites', 15.2, 6500, 1, '2021-01-01T00:00:00Z', '2024-03-01T00:00:00Z');

commit;
