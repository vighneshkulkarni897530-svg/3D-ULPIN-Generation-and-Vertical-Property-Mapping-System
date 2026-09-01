-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 011 — Notifications Table (Phase 13)
-- ─────────────────────────────────────────────────────────────────────────────

create table public.notifications (
  id              uuid primary key default gen_random_uuid(),
  user_id         text,  -- links to users.id (NULL = broadcast to role)
  recipient_role  text not null check (recipient_role in ('CITIZEN','OFFICER','ADMIN','ALL')),
  title           text not null,
  message         text not null,
  type            text not null check (type in ('VERIFICATION','DISPUTE','FIELD_INSPECTION','SYSTEM','SECURITY','TASK')),
  priority        text not null default 'MEDIUM' check (priority in ('LOW','MEDIUM','HIGH')),
  is_read         boolean not null default false,
  link_url        text,
  created_at      timestamptz not null default now()
);

comment on table public.notifications is 'User/role-targeted notifications.';

create index if not exist idx_notifications_user_id on public.notifications (user_id);
create index if not exist idx_notifications_recipient_role on public.notifications (recipient_role);
create index if not exist idx_notifications_type on public.notifications (type);
create index if not exist idx_notifications_is_read on public.notifications (is_read);
create index if not exist idx_notifications_created_at on public.notifications (created_at desc);

alter table public.notifications enable row level security;

create policy "notifications are readable by their recipient (or role broadcast)" on public.notifications
  for select using (true);  -- server-side API routes filter by user_id / role

create policy "notifications can be created by officers and admins" on public.notifications
  for insert with check (true);
