-- =============================================================================
-- PoolOps Pro — schedule draft persistence (Fix 1). Run AFTER schema.sql. Idempotent.
--
-- A schedule draft is a big computed artifact (shifts, warnings, coverage, …). We
-- store the whole draft as a JSONB blob on the existing schedule_drafts row (single
-- table, org-scoped by the generic RLS) so a manager's work-in-progress draft
-- survives refresh. Published shifts are written to `shifts` separately.
-- =============================================================================

alter table public.schedule_drafts add column if not exists draft_json jsonb;
