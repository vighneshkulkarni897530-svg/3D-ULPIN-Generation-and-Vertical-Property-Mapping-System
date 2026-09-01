-- Seed: Disputes (Phase 13)
begin;

insert into disputes (id, dispute_ticket_number, property_id, ulpin, property_title,
  property_address, raised_by_user_id, raised_by_user_name, raised_by_user_contact,
  category, title, description, claimed_coordinates, evidences, status,
  assigned_officer_id, assigned_officer_name, created_at, updated_at,
  hearing_date, officer_inspection_notes, resolution_summary)
values
  ('dsp-2024-001', 'DSP-2024-9921', 'prop-hyd-002', '14092837482911',
   'Green Valley Residency Block A & B', 'Survey 118/2, Financial District, Gachibowli, Hyderabad',
   'usr-cit-101', 'Rajesh V. Sharma', '+91 98450 12345',
   'BOUNDARY_MISMATCH', 'Western Parcel 60ft Arterial Road Boundary Encroachment',
   'The physical boundary stone on the western side is offset by approximately 2.8 meters compared to the Cadastral Vector Map (Survey 118/2). Adjacent contractor has erected an unapproved fence inside our registered plot.',
   '{"type":"LineString","coordinates":[[78.3480,17.4408],[78.3486,17.4392]]}'::jsonb,
   '[{"id":"ev-01","fileName":"western-boundary-fence-photo.jpg","fileType":"IMAGE","fileUrl":"https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&auto=format&fit=crop&q=80","fileSize":"3.2 MB","uploadedAt":"2024-02-14 11:20 AM","sha256Hash":"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"},{"id":"ev-02","fileName":"dgps-surveyor-report.pdf","fileType":"PDF","fileUrl":"/mock-documents/surveyor-dgps-report.pdf","fileSize":"4.7 MB","uploadedAt":"2024-02-14 11:25 AM","sha256Hash":"9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08"}]'::jsonb,
   'UNDER_INVESTIGATION', 'usr-off-202', 'Dr. Ananya Iyer, IAS',
   '2024-02-14T11:20:00Z', '2024-02-22T04:15:00Z', '2024-03-15T11:00:00Z',
   'Preliminary DGPS coordinates analyzed. High probability of boundary stone displacement during road widening work in 2022. Resurvey team scheduled with Total Station instrumentation.',
   NULL),

  ('dsp-2024-002', 'DSP-2024-8840', 'prop-blr-001', '14092837482910',
   'Skyline Heights Commercial & Tech Tower', 'Plot 42/B, Outer Ring Road, Mahadevapura, Bengaluru',
   'usr-cit-404', 'Vanguard Legal Holdings', '+91 98451 99882',
   'AREA_DISCREPANCY', 'Carpet Area Calculation Variance in 4th Floor Unit 401',
   'Discrepancy of 45 sq ft noted between sanctioned architectural drawing and physical unit handover verification.',
   NULL,
   '[{"id":"ev-03","fileName":"architectural-sanction-floor4.pdf","fileType":"PDF","fileUrl":"/mock-documents/floor4-plan.pdf","fileSize":"2.1 MB","uploadedAt":"2024-02-28 02:00 PM","sha256Hash":"5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8"}]'::jsonb,
   'OPEN', NULL, NULL,
   '2024-02-28T14:00:00Z', '2024-02-28T14:00:00Z', NULL, NULL, NULL);

commit;
