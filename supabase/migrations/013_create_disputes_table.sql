-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 013 — Disputes Table (Phase 13)
-- ─────────────────────────────────────────────────────────────────────────────
-- Citizen-raised disputes against property records.

create table public.disputes (
  id                  uuid primary key default gen_random_uuid(),
  dispute_ticket_number text not null unique,
  property_id         text not null,  -- links to property_units.demo_spatial_id
  ulpin               text not null,
  property_title      text not null,
  property_address    text not null,
  raised_by_user_id   text not null,  -- links to users.id
  raised_by_user_name text not null,
  raised_by_user_contact text not null,
  category            text not null check (category in ('BOUNDARY_MISMATCH','OWNERSHIP_DISPUTE','AREA_DISCREPANCY','ILLEGAL_ENCROACHMENT','DOCUMENT_FORGERY','ZONING_VIOLATION','OTHER')),
  title               text not null,
  description         text not null,
  claimed_coordinates jsonb,
  evidences           jsonb not null default '[]'::jsonb,
  status              text not null default 'OPEN' check (status in ('OPEN','UNDER_INVESTIGATION','HEARING_SCHEDULED','RESOLVED','REJECTED')),
  assigned_officer_id text,  -- links to users.id
  assigned_officer_name text,
  hearing_date        timestamptz,
  officer_inspection_notes text,
  resolution_summary  text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on table public.disputes is 'Citizen-raised property disputes.';

create trigger _disputes_updated_at
  before update on public.disputes
  for each row execute function public._update_updated_at();

create index if not exist idx_disputes_property_id on public.disputes (property_id);
create index if not exist idx_disputes_ulpin on public.disputes (ulpin);
create index if not exist idx_disputes_category on public.disputes (category);
create index if not exist idx_disputes_status on public.disputes (status);
create index if not exist idx_disputes_raised_by on public.disputes (raised_by_user_id);
create index if not exist idx_disputes_assigned_officer on public.disputes (assigned_officer_id);
create index if not exist idx_disputes_created_at on public.disputes (created_at desc);

alter table public.disputes enable row level security;

create policy "disputes are readable by officers and admins" on public.disputes
  for select using (true);

create policy "disputes are managed by officers and admins" on public.disputes
  for all using (true)
  with check (true);
