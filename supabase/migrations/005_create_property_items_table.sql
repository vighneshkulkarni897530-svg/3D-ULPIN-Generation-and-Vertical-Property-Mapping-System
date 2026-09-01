-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 005 — Property Items Table (Phase 13)
-- ─────────────────────────────────────────────────────────────────────────────
-- Legacy PropertyItem system (Phase 1–7). Each property item has a ULPIN
-- (Bhu-Aadhaar) and rich ownership/survey details stored as JSONB.
-- The `property_id` column links this record to the GIS PropertyUnit via its
-- `demo_spatial_id`, enabling cross-referencing between the two systems.

create table public.property_items (
  id                    uuid primary key default gen_random_uuid(),
  ulpin                 text not null unique,
  property_id           text not null,  -- links to a PropertyUnit.demo_spatial_id (or official_ulpin_reference)
  title                 text not null,
  property_type         text not null check (property_type in ('COMMERCIAL','RESIDENTIAL','INDUSTRIAL','AGRICULTURAL','MIXED_USE','GOVERNMENT')),
  primary_owner_name    text not null,
  co_owners             text[],
  owner_contact_masked  text not null,
  owner_aadhaar_masked  text not null,
  address               text not null,
  city                  text not null,
  district              text not null,
  state                 text not null,
  pincode               text not null,
  latitude              numeric not null,
  longitude             numeric not null,
  boundary_coordinates  jsonb not null,
  adjacent_parcels      jsonb,
  verification_status   text not null check (verification_status in ('SUBMITTED','UNDER_REVIEW','FIELD_VERIFICATION_REQUESTED','OFFICER_ASSIGNED','VERIFICATION_IN_PROGRESS','VERIFIED','REJECTED','DISPUTED')),
  market_valuation_inr  numeric not null,
  government_valuation_inr numeric not null,
  featured_image_url    text not null,
  aerial_image_url      text,
  has_active_dispute    boolean not null default false,
  land_details          jsonb,
  building              jsonb,
  documents             jsonb,
  verification_history  jsonb,
  assigned_officer      jsonb,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

comment on table public.property_items is 'Legacy property records with ULPIN and full survey details (Phase 1–7).';

create trigger _property_items_updated_at
  before update on public.property_items
  for each row execute function public._update_updated_at();

create index if not exists idx_property_items_property_id on public.property_items (property_id);
create index if not exists idx_property_items_ulpin on public.property_items (ulpin);
create index if not exists idx_property_items_verification_status on public.property_items (verification_status);
create index if not exists idx_property_items_has_active_dispute on public.property_items (has_active_dispute);
create index if not exists idx_property_items_district on public.property_items (district);

alter table public.property_items enable row level security;

create policy "property_items are readable by all" on public.property_items
  for select using (true);

create policy "property_items are managed by officers and admins" on public.property_items
  for all using (true)
  with check (true);
