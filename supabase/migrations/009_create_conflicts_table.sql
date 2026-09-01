-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 009 — Conflicts Table (Phase 13)
-- ─────────────────────────────────────────────────────────────────────────────
-- Spatial conflicts detected during the 3D ULPIN generation pipeline
-- (boundary overlaps, invalid geometries, etc.).

create table public.conflicts (
  id                  uuid primary key default gen_random_uuid(),
  conflict_number     text not null unique,
  type                text not null check (type in ('Boundary Overlap','Missing Boundary','Invalid Geometry','Outside Parent Parcel','Duplicate Spatial ID')),
  severity            text not null check (severity in ('Low','Medium','High','Critical')),
  status              text not null default 'Pending Review' check (status in ('Pending Review','Under Investigation','Resolved')),
  parcel_id           uuid references public.parcels(id) on delete set null,
  building_id         uuid references public.buildings(id) on delete set null,
  affected_property_ids text[] not null,
  description         text not null,
  detected_at         timestamptz not null default now(),
  resolved_at         timestamptz,
  resolved_by         text,  -- links to users.id
  resolution_notes    text,
  last_action_at      timestamptz,
  field_review        jsonb,
  correction_request  jsonb,
  geometry            geometry(geometry, 4326),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on table public.conflicts is 'Spatial conflicts detected in the 3D ULPIN pipeline.';

create trigger _conflicts_updated_at
  before update on public.conflicts
  for each row execute function public._update_updated_at();

create index if not exist idx_conflicts_type on public.conflicts (type);
create index if not exist idx_conflicts_severity on public.conflicts (severity);
create index if not exist idx_conflicts_status on public.conflicts (status);
create index if not exist idx_conflicts_parcel_id on public.conflicts (parcel_id);
create index if not exist idx_conflicts_building_id on public.conflicts (building_id);
create index if not exist idx_conflicts_detected_at on public.conflicts (detected_at desc);
create index if not exist idx_conflicts_geometry on public.conflicts using GIST (geometry);

alter table public.conflicts enable row level security;

create policy "conflicts are readable by all" on public.conflicts
  for select using (true);

create policy "conflicts are managed by officers and admins" on public.conflicts
  for all using (true)
  with check (true);
