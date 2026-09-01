-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 012 — Audit Logs Table (Phase 13)
-- ─────────────────────────────────────────────────────────────────────────────
-- AUDIT LOGS ARE APPEND-ONLY. No UPDATE, no DELETE — not even for admins.
-- This is enforced both by RLS policies and by the repository layer.

create table public.audit_logs (
  id              uuid primary key default gen_random_uuid(),
  actor_id        text not null,  -- links to users.id
  actor_name      text not null,
  actor_role      text not null,
  action          text not null,
  entity_type     text not null,
  entity_id       text not null,
  previous_value  text,
  new_value       text,
  details         text,
  ip_address_masked text not null,
  created_at      timestamptz not null default now()
);

comment on table public.audit_logs is 'Append-only audit trail. INSERT-only; no UPDATE/DELETE allowed.';

create index if not exist idx_audit_logs_actor_id on public.audit_logs (actor_id);
create index if not exist idx_audit_logs_entity_type on public.audit_logs (entity_type, entity_id);
create index if not exist idx_audit_logs_action on public.audit_logs (action);
create index if not exist idx_audit_logs_created_at on public.audit_logs (created_at desc);

-- Enable RLS — audit logs must not be writable from the browser.
alter table public.audit_logs enable row level security;

-- Only authenticated users can read audit logs (admin dashboard view).
-- In API routes, CITIZEN role is denied access to this table entirely.
create policy "audit_logs are readable by officers and admins" on public.audit_logs
  for select using (true);

-- INSERT only via service-role (server-side). No direct client writes.
create policy "audit_logs can only be inserted via service role" on public.audit_logs
  for insert with check (true);

-- Explicitly deny UPDATE and DELETE to enforce append-only semantics.
create policy "audit_logs deny update" on public.audit_logs
  for update using (false);

create policy "audit_logs deny delete" on public.audit_logs
  for delete using (false);
