-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 001 — Extensions & Users Table (Phase 13)
-- ─────────────────────────────────────────────────────────────────────────────
-- Enables PostGIS for spatial/geometry storage and creates the users table that
-- mirrors the existing Phase 10 in-memory user store.
--
-- NOTE: This project does NOT use Supabase Auth. Authentication continues to be
-- handled by the Phase 10 httpOnly session cookie. The users table here is a
-- PERSISTENT backing store for user/application data. Authorization is
-- enforced server-side via the session cookie in every API route handler.
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable PostGIS for spatial types (geometry, geography, spatial functions, indexes)
create extension if not exists postgis;

-- ── Users ────────────────────────────────────────────────────────────────────
create table public.users (
  id              text primary key,           -- e.g. usr-cit-101
  name            text not null,
  email           text not null unique,
  role            text not null check (role in ('CITIZEN','OFFICER','ADMIN')),
  account_status  text not null default 'ACTIVE' check (account_status in ('ACTIVE','DISABLED')),
  phone           text,
  aadhaar_or_gov_id text,
  avatar_url      text,
  department      text,
  designation     text,
  jurisdiction_district text,
  badge_number    text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.users is 'Persistent user accounts mirroring the Phase 10 prototype user store. Auth is still session-cookie based.';

-- ── Trigger function: auto-update updated_at ────────────────────────────────
-- Shared across all tables that have an updated_at column.
create or replace function public._update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql security definer;

-- Auto-update updated_at on row change
create trigger _users_updated_at
  before update on public.users
  for each row execute function public._update_updated_at();

-- Indexes
create index if not exists idx_users_role on public.users (role);
create index if not exists idx_users_email on public.users (email);
create index if not exists idx_users_account_status on public.users (account_status);

-- ── Row Level Security ───────────────────────────────────────────────────────
-- Users can read any account (for role-based display), but can only modify
-- their own profile. Admin role/status changes are enforced in API routes.
-- In production, if Supabase Auth is adopted, these policies would reference
-- auth.uid(). Until then, the service-role client (server-side only) is used
-- for all write operations, with authorization checked in API route handlers.
alter table public.users enable row level security;

create policy "users can read all accounts" on public.users
  for select using (true);

create policy "users can update own profile" on public.users
  for update using (true)  -- server-side API routes enforce ownership
  with check (true);
