-- ─────────────────────────────────────────────────────────────────────────────
-- Seed: Users (Phase 13)
-- ─────────────────────────────────────────────────────────────────────────────
-- Mirrors the Phase 10 prototype user store.
-- ─────────────────────────────────────────────────────────────────────────────

begin;

insert into users (id, name, email, role, account_status, phone, aadhaar_or_gov_id, avatar_url, department, designation, jurisdiction_district, badge_number, created_at, updated_at)
values
  ('usr-cit-101', 'Rajesh V. Sharma', 'rajesh.sharma@example.com', 'CITIZEN', 'ACTIVE', '+91 98450 12345', 'XXXX-XXXX-8921',
   'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
   null, null, 'Bengaluru Urban', null, '2023-01-01T00:00:00Z', '2024-03-01T00:00:00Z'),
  ('usr-cit-404', 'Vanguard Legal Holdings', 'contact@vanguardlegal.in', 'CITIZEN', 'ACTIVE', '+91 98451 99882', null,
   null, null, null, 'Bengaluru Urban', null, '2023-06-01T00:00:00Z', '2024-03-01T00:00:00Z'),
  ('usr-off-202', 'Dr. Ananya Iyer, IAS', 'ananya.iyer@rev.gov.in', 'OFFICER', 'ACTIVE', '+91 98200 98765', 'GOV-KA-REV-4491',
   'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
   'Department of Land Records & Cadastre (Bhoomika)', 'Senior Cadastral Revenue Officer & Joint Registrar', 'Bengaluru Urban & South Division', 'KA-REV-7782', '2022-01-01T00:00:00Z', '2024-03-01T00:00:00Z'),
  ('usr-off-204', 'Sanjay Verma, IAS', 'sanjay.verma@rev.gov.in', 'OFFICER', 'ACTIVE', '+91 98201 10001', 'GOV-KA-REV-4492',
   null, 'Department of Land Records & Cadastre (Bhoomika)', 'Deputy Cadastral Officer', 'Pune District', 'KA-REV-7783', '2022-06-01T00:00:00Z', '2024-03-01T00:00:00Z'),
  ('usr-adm-303', 'K. S. Narayana Swamy', 'admin.cadastre@gov.in', 'ADMIN', 'ACTIVE', '+91 94480 55667', 'DIR-LAND-GOV-001',
   'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
   'Ministry of Housing & Urban Cadastre Affairs', 'State Cadastral Data Director & Systems Chief', 'Karnataka State Apex Jurisdiction', 'ADMIN-DIR-009', '2021-01-01T00:00:00Z', '2024-03-01T00:00:00Z');

commit;
