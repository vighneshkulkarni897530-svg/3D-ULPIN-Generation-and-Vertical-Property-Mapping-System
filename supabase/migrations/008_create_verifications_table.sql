-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 008 — Verifications Table (Phase 13)
-- ─────────────────────────────────────────────────────────────────────────────
-- Records every property verification event (who, when, what changed).

create table public.verifications (
  id              uuid primary key default gen_random_uuid(),
  property_id     text not null,  -- links to property_units.demo_spatial_id
  previous_status text,
  new_status      text not null,
  verified_by     text not null,  -- links to users.id
  verified_by_role text not null check (verified_by_role in ('OFFICER','CITIZEN','SYSTEM','AI_AGENT')),
  verification_date timestamptz not null default now(),
  notes           text not null,
  photo_url       text,
  gps_matched     boolean not null default false,
  boundary_matched boolean not null default false,
  confidence_score real not null check (confidence_score >= 0 and confidence_score <= 1),
  method          text not null check (method in ('RTK_GNSS','DRONE_SCAN','TOTAL_STATION','VISUAL_INSPECTION','AI_EXTRACTION')),
  source          text not null check (source in ('OFFICER','CITIZEN','SYSTEM','AI_AGENT')),
  created_at      timestamptz not null default now()
);

comment on table public.verifications is 'Verification events for property units.';

create index if not exist idx_verifications_property_id on public.verifications (property_id);
create index if not exist idx_verifications_verified_by on public.verifications (verified_by);
create index if not exist idx_verifications_method on public.verifications (method);
create index if not exist idx_verifications_source on public.verifications (source);
create index if not exist idx_verifications_date on public.verifications (verification_date desc);

alter table public.verifications enable row level security;

create policy "verifications are readable by officers and admins" on public.verifications
  for select using (true);  -- server-side API routes enforce role-based access

create policy "verifications can be created by officers and admins" on public.verifications
  for insert with check (true);
