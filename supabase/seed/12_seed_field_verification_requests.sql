-- Seed: Field Verification Requests (Phase 13)
begin;

insert into field_verification_requests (id, request_number, property_id, ulpin,
  property_title, property_address, requested_by_user_id, requested_by_user_name,
  survey_type, urgency, preferred_date, reason, evidences, status,
  assigned_officer_id, assigned_officer_name, inspection_report_url, officer_findings, created_at)
values
  ('fvr-001', 'FVR-2024-5541', 'prop-pun-003', '14092837482912',
   'Royal Palm Residential Highrise Towers', 'Survey 48/A, Baner-Pashan Link Road, Pune',
   'usr-cit-101', 'Sunita V. Deshpande',
   'DRONE_CADASTRE_SCAN', 'HIGH_PRIORITY', '2024-03-12',
   'Final Completion Certificate requirement by Municipal Corporation. Need official drone aerial LiDAR imagery and setback compliance report.',
   '[]'::jsonb, 'SCHEDULED', 'usr-off-202', 'Dr. Ananya Iyer, IAS', NULL,
   'Drone flight path cleared with local aviation cell. Ground survey team configured.',
   '2024-02-28T10:15:00Z'),

  ('fvr-002', 'FVR-2024-3312', 'prop-hyd-002', '14092837482911',
   'Green Valley Residency Block A & B', 'Survey 118/2, Financial District, Gachibowli, Hyderabad',
   'usr-cit-101', 'Venkat Rao Deshmukh',
   'CORNER_DEMARCATION', 'URGENT', '2024-03-08',
   'Fixing physical corner stone monuments post dispute resolution.',
   '[]'::jsonb, 'IN_PROGRESS', 'usr-off-202', 'Dr. Ananya Iyer, IAS', NULL, NULL,
   '2024-02-25T09:30:00Z');

commit;
