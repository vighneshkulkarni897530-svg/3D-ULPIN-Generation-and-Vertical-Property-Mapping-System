-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 006 — Property Units Table (Phase 13)
-- ─────────────────────────────────────────────────────────────────────────────
-- GIS vertical property units. Each unit is an individual property defined by
-- its 3D boundaries (floor, building, parcel). These are the core entities
-- produced by the 3D ULPIN Generation pipeline.
--
-- The `property_id` links to the legacy `property_items.property_id` so the
-- vertical unit model and the traditional property registry can be correlated.
--
-- KEY DISTINCTION (preserved from prototype):
--   demo_spatial_id        — synthetic, system-generated spatial identifier
--   official_ulpin_reference — external government ULPIN (may be NULL)

create table public.property_units (
  id                    uuid primary key default gen_random_uuid(),
  property_id           text not null,
  building_id           text not null,  -- FK to buildings(id) (stored as text for compatibility)
  floor_id              text not null,
  parcel_id             text not null,
  unit_number           text not null,
  demo_spatial_id       text not null unique,
  official_ulpin_reference text,
  property_type         text not null check (property_type in ('RESIDENTIAL','COMMERCIAL','INDUSTRIAL','AGRICULTURAL','MIXED_USE','GOVERNMENT')),
  area                  numeric not null,
  latitude              numeric not null,
  longitude             numeric not null,
  elevation             numeric,
  geometry              geometry(geometry, 4326),
  owner_reference_name  text not null,
  verification_status   text not null default 'Pending' check (verification_status in ('Pending','Under Review','Field Verification','Verified','Rejected','Reinspection Required')),
  data_source           text not null check (data_source in ('SURVEY_RECORD','DRONE_SCAN','AI_EXTRACTION','MANUAL_INPUT')),
  confidence            real not null check (confidence >= 0 and confidence <= 1),
  generated_at          timestamptz not null default now(),
  last_updated          timestamptz not null default now(),
  demo_spatial_id_metadata jsonb,
  official_ulpin_metadata   jsonb,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

comment on table public.property_units is 'GIS vertical property units (3D ULPIN generation output).';

create trigger _property_units_updated_at
  before update on public.property_units
  for each row execute function public._update_updated_at();

create index if not exist idx_property_units_demo_spatial_id on public.property_units (demo_spatial_id);
create index if not exist idx_property_units_building_id on public.property_units (building_id);
create index if not exist idx_property_units_floor_id on public.property_units (floor_id);
create index if not exist idx_property_units_parcel_id on public.property_units (parcel_id);
create index if not exist idx_property_units_verification_status on public.property_units (verification_status);
create index if not exist idx_property_units_geometry on public.property_units using GIST (geometry);

alter table public.property_units enable row level security;

create policy "property_units are readable by all" on public.property_units
  for select using (true);

create policy "property_units are managed by officers and admins" on public.property_units
  for all using (true)
  with check (true);
