-- Seed: Spatial Conflicts (Phase 13)
begin;

insert into conflicts (id, conflict_number, type, severity, status, parcel_id, building_id,
  affected_property_ids, description, detected_at, geometry, created_at, updated_at)
values
  ('CONFLICT-001', 'CON-2025-001', 'Boundary Overlap', 'Critical', 'Pending Review',
   'PARCEL-MH-PUN-001', 'B-102',
   array['PROP-102-0202','PROP-104-G01'],
   'Cadastral boundary of PARCEL-MH-PUN-001 (Shivaji Nagar) overlaps with PARCEL-MH-PUN-002 (Koregaon Park) by ~1.2 metres along the eastern edge. Units PROP-102-0202 and PROP-104-G01 are in the affected zone.',
   '2025-03-10T06:45:00Z',
   st_geomfromgeojson('{"type":"Polygon","coordinates":[[73.8543,18.5330],[73.8548,18.5330],[73.8548,18.5334],[73.8543,18.5334],[73.8543,18.5330]]}'),
   '2025-03-10T06:45:00Z', '2025-03-10T06:45:00Z'),

  ('CONFLICT-002', 'CON-2025-002', 'Missing Boundary', 'High', 'Under Investigation',
   'PARCEL-MH-PUN-003', 'B-306',
   array['PROP-306-G01','PROP-306-0101','PROP-306-0201','PROP-306-0301'],
   'Building B-306 (Tech Tower) on parcel PARCEL-MH-PUN-003 is missing its survey boundary polygon in the cadastral records. Without the boundary, unit-level verification cannot proceed for 4 affected units.',
   '2025-03-08T14:20:00Z',
   st_geomfromgeojson('{"type":"Polygon","coordinates":[[73.7742,18.5670],[73.7755,18.5670],[73.7755,18.5678],[73.7742,18.5678],[73.7742,18.5670]]}'),
   '2025-03-08T14:20:00Z', '2025-03-08T14:20:00Z'),

  ('CONFLICT-003', 'CON-2025-003', 'Duplicate Spatial ID', 'Medium', 'Pending Review',
   'PARCEL-MH-PUN-003', 'B-306',
   array['PROP-102-0101','PROP-306-0101'],
   'Demo spatial ID collision detected: both PROP-102-0101 (3D-MH-PUN-102-0101) and PROP-306-0101 (3D-MH-PUN-306-0101) share the same unit-number suffix "0101". The AI extraction pipeline flagged this as a potential duplicate spatial ID. No ownership conflict confirmed yet.',
   '2025-03-09T11:10:00Z',
   st_geomfromgeojson('{"type":"Polygon","coordinates":[[73.7747,18.5678],[73.7750,18.5678],[73.7750,18.5680],[73.7747,18.5680],[73.7747,18.5678]]}'),
   '2025-03-09T11:10:00Z', '2025-03-09T11:10:00Z');

commit;
