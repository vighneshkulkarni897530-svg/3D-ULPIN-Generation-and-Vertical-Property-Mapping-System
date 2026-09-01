-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 015 — Activities Table (Phase 13)
-- ─────────────────────────────────────────────────────────────────────────────
-- Unified activity feed (merges verification events, disputes, workflow
-- changes, field inspections, and audit entries into a single timeline).

create table public.activities (
  id          uuid primary key default gen_random_uuid(),
  type        text not null,
  title       text not null,
  description text,
  entity_type text not null,
  entity_id   text not null,
  timestamp   timestamptz not null default now(),
  user        text not null,
  user_role   text not null,
  status      text not null default 'COMPLETED' check (status in ('COMPLETED','IN_PROGRESS','PENDING','FAILED')),
  metadata    jsonb,
  created_at  timestamptz not null default now()
);

comment on table public.activities is 'Unified activity feed timeline.';

create index if not exist idx_activities_entity_type on public.activities (entity_type, entity_id);
create index if not exist idx_activities_timestamp on public.activities (timestamp desc);
create index if not exist idx_activities_user on public.activities (user);
create index if not exist idx_activities_user_role on public.activities (user_role);
create index if not exist idx_activities_type on public.activities (type);

alter table public.activities enable row level security;

create policy "activities are readable by all" on public.activities
  for select using (true);
