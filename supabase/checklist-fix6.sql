-- =============================================================================
-- PoolOps Pro — Fix 6 checklist persistence. Run AFTER schema.sql. Idempotent.
--
-- Admin-created checklists must persist so lifeguards see them. We store the items
-- inline as JSONB on the template (single-table, org-scoped by the generic RLS — no
-- child-table RLS gap), add an `archived` flag, and stamp each completion with the
-- operating DAY it counts for so the compliance tracker can group by day.
-- =============================================================================

alter table public.checklist_templates add column if not exists items jsonb not null default '[]'::jsonb;
alter table public.checklist_templates add column if not exists archived boolean not null default false;

alter table public.checklist_completions add column if not exists for_date date not null default (now() at time zone 'utc')::date;
create index if not exists idx_checklist_completions_day
  on public.checklist_completions(organization_id, for_date);
