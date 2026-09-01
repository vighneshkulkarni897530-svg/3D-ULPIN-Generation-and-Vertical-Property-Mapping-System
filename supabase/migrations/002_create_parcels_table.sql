-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 002 — Parcels Table (Phase 13)
-- ─────────────────────────────────────────────────────────────────────────────
-- Stores land parcels with PostGIS geometry (SRID 4326) for spatial queries.

create table public.parcels (
  id              uuid primary key default gen_random_uuid(),
  parcel_number   text not null unique,
  location        text not null,
  district        text not null,
  state           text not null,
  area            numeric not null,
  geometry        geometry(geometry, 4326),
  centroid_lat    numeric,
  centroid_lng    numeric,
  latitude        numeric,
  longitude       numeric,
  status          text not null default 'ACTIVE' check (status in ('ACTIVE','INACTIVE','DISPUTED')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.parcels is 'Land parcels with spatial geometry (PostGIS, SRID 4326).';

create trigger _parcels_updated_at
  before update on public.parcels
  for each row execute function public._update_updated_at();

-- Spatial index on geometry for fast spatial queries
create index if not exists idx_parcels_geometry on public.parcels using GIST (geometry);
create index if not exists idx_parcels_centroid on public.parcels (centroid_lat, centroid_lng);
create index if not exists idx_parcels_status on public.parcels (status);
create index if not exists idx_parcels_district on public.parcels (district);

alter table public.parcels enable row level security;

create policy "parcels are readable by all" on public.parcels
  for select using (true);

create policy "parcels are managed by officers and admins" on public.parcels
  for all using (true)
  with check (true);
-- Authorization is enforced in API route handlers; service-role client is server-only.
