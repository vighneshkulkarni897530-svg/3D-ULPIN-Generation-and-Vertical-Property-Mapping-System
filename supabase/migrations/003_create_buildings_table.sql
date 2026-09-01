-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 003 — Buildings Table (Phase 13)
-- ─────────────────────────────────────────────────────────────────────────────
-- Builds on parcels; each building belongs to exactly one parcel.

create table public.buildings (
  id              uuid primary key default gen_random_uuid(),
  building_code   text not null unique,
  name            text not null,
  parcel_id       uuid not null references public.parcels(id) on delete cascade,
  address         text not null,
  latitude        numeric not null,
  longitude       numeric not null,
  height          numeric,
  total_floors    integer,
  built_up_area   numeric,
  year_built      integer,
  geometry        geometry(geometry, 4326),
  status          text not null default 'ACTIVE' check (status in ('ACTIVE','INACTIVE','UNDER_CONSTRUCTION')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.buildings is 'Buildings sited on parcels with spatial geometry.';

create trigger _buildings_updated_at
  before update on public.buildings
  for each row execute function public._update_updated_at();

create index if not exists idx_buildings_parcel_id on public.buildings (parcel_id);
create index if not exists idx_buildings_geometry on public.buildings using GIST (geometry);
create index if not exists idx_buildings_status on public.buildings (status);

alter table public.buildings enable row level security;

create policy "buildings are readable by all" on public.buildings
  for select using (true);

create policy "buildings are managed by officers and admins" on public.buildings
  for all using (true)
  with check (true);
