-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 004 — Floors Table (Phase 13)
-- ─────────────────────────────────────────────────────────────────────────────
-- Each floor belongs to one building. Floors are the vertical stacking unit
-- used by the property/unit model below.

create table public.floors (
  id              uuid primary key default gen_random_uuid(),
  building_id     uuid not null references public.buildings(id) on delete cascade,
  floor_number    integer not null,
  name            text not null,
  elevation       numeric,
  area            numeric,
  total_units     integer,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.floors is 'Floors within buildings (vertical stacking layer).';

create trigger _floors_updated_at
  before update on public.floors
  for each row execute function public._update_updated_at();

create index if not exists idx_floors_building_id on public.floors (building_id);
create index if not exists idx_floors_floor_number on public.floors (building_id, floor_number);

alter table public.floors enable row level security;

create policy "floors are readable by all" on public.floors
  for select using (true);

create policy "floors are managed by officers and admins" on public.floors
  for all using (true)
  with check (true);
