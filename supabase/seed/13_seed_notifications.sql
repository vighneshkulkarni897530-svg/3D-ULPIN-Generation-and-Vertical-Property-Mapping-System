-- Seed: Notifications (Phase 13)
begin;

insert into notifications (id, user_id, recipient_role, title, message, type,
  priority, is_read, link_url, created_at)
values
  ('notif-001', 'usr-cit-101', 'CITIZEN', 'Verification Certificate Issued',
   'Your property Skyline Heights (ULPIN: 14092837482910) has been officially verified and granted Bhu-Aadhaar Digital Cadastral Seal.',
   'VERIFICATION', 'HIGH', false, '/properties/prop-blr-001', '2025-03-10T11:50:00Z'),

  ('notif-002', NULL, 'OFFICER', 'New Field Verification Assigned',
   'Drone cadastre survey request (FVR-2024-5541) assigned to your jurisdiction in Baner, Pune.',
   'FIELD_INSPECTION', 'HIGH', false, '/dashboard/officer', '2025-03-10T11:00:00Z'),

  ('notif-003', 'usr-cit-101', 'CITIZEN', 'Dispute Hearing Scheduled',
   'Revenue Court hearing scheduled for Case DSP-2024-9921 on March 15, 2024 at 11:00 AM.',
   'DISPUTE', 'MEDIUM', true, '/disputes/dsp-2024-001', '2025-03-09T12:00:00Z'),

  ('notif-004', NULL, 'ADMIN', 'State Cadastre Sync Completed',
   '94,280 land records reconciled across Karnataka Bhoomika & Telangana Dharani datasets.',
   'SYSTEM', 'LOW', true, '/dashboard/admin', '2025-03-08T12:00:00Z');

commit;
