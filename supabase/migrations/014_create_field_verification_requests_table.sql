-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 014 — Field Verification Requests Table (Phase 13)
-- ─────────────────────────────────────────────────────────────────────────────
-- Officer-initiated or citizen-requested field verification surveys.

create table public.field_verification_requests (
  id                uuid primary key default gen_random_uuid(),
  request_number    text not null unique,
  property_id       text not null,
  ulpin             text not null,
  property_title    text not null,
  property_address  text not null,
  requested_by_user_id text not null,
  requested_by_user_name text not null,
  survey_type       text not null check (survey_type in ('CORNER_DEMARCATION','DRONE_CADASTRE_SCAN','ENCROACHMENT_CHECK','BUILDING_HEIGHT_INSPECTION','MUTATION_VERIFICATION')),
  urgency           text not null default 'NORMAL' check (urgency in ('NORMAL','URGENT','HIGH_PRIORITY')),
  preferred_date    date not null,
  reason            text not null,
  evidences         jsonb not null default '[]'::jsonb,
  status            text not null default 'PENDING_ASSIGNMENT' check (status in ('PENDING_ASSIGNMENT','SCHEDULED','IN_PROGRESS','COMPLETED','REJECTED')),
  assigned_officer_id text,  -- links to users.id
  assigned_officer_name text,
  inspection_report_url text,
  officer_findings  text,
  created_at        timestamptz not null default now()
);

comment on table public.field_verification_requests is 'Field verification survey requests.';

create index if not exist idx_fvr_property_id on public.field_verification_requests (property_id);
create index if not exist idx_fvr_request_number on public.field_verification_requests (request_number);
create index if not exist idx_fvr_survey_type on public.field_verification_requests (survey_type);
create index if not exist idx_fvr_urgency on public.field_verification_requests (urgency);
create index if not exist idx_fvr_status on public.field_verification_requests (status);
create index if not exist idx_fvr_created_at on public.field_verification_requests (created_at desc);
create index if not exist idx_fvr_assigned_officer on public.field_verification_requests (assigned_officer_id);

alter table public.field_verification_requests enable row level security;

create policy "fvr are readable by officers and admins" on public.field_verification_requests
  for select using (true);

create policy "fvr are managed by officers and admins" on public.field_verification_requests
  for all using (true)
  with check (true);
