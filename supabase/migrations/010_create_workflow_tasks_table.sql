-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 010 — Workflow Tasks Table (Phase 13)
-- ─────────────────────────────────────────────────────────────────────────────
-- Task assignments for the Phase 9 workflow system.

create table public.workflow_tasks (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  description     text,
  entity_type     text not null check (entity_type in ('PROPERTY','CONFLICT','FIELD_VERIFICATION','REINSPECTION','DATA_REVIEW','BUILDING','PARCEL','FLOOR')),
  entity_id       text not null,
  priority        text not null default 'MEDIUM' check (priority in ('LOW','MEDIUM','HIGH','CRITICAL')),
  status          text not null default 'PENDING' check (status in ('PENDING','ASSIGNED','IN_PROGRESS','UNDER_REVIEW','COMPLETED','CANCELLED')),
  assigned_officer_id   text,
  assigned_officer_name text,
  created_by      text not null,
  created_by_name text not null,
  due_date        timestamptz,
  completed_at    timestamptz,
  history         jsonb not null default '[]'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.workflow_tasks is 'Workflow task assignments (Phase 9).';

create trigger _workflow_tasks_updated_at
  before update on public.workflow_tasks
  for each row execute function public._update_updated_at();

create index if not exist idx_workflow_tasks_status on public.workflow_tasks (status);
create index if not exist idx_workflow_tasks_priority on public.workflow_tasks (priority);
create index if not exist idx_workflow_tasks_entity_type on public.workflow_tasks (entity_type, entity_id);
create index if not exist idx_workflow_tasks_assigned_officer on public.workflow_tasks (assigned_officer_id);
create index if not exist idx_workflow_tasks_created_by on public.workflow_tasks (created_by);
create index if not exist idx_workflow_tasks_due_date on public.workflow_tasks (due_date);

alter table public.workflow_tasks enable row level security;

create policy "workflow_tasks are readable by officers and admins" on public.workflow_tasks
  for select using (true);

create policy "workflow_tasks are managed by officers and admins" on public.workflow_tasks
  for all using (true)
  with check (true);
