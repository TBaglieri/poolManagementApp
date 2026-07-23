-- =============================================================================
-- PoolOps Pro — chemical_logs.taken_at (when the reading was actually taken)
-- Run AFTER schema.sql. ADDITIVE + idempotent, SQL-Editor safe.
--
-- A reading's TAKEN-AT time (tenant-timezone aware, user-editable, may be backdated
-- to catch up a missed entry) is stored separately from created_at (the audit time).
-- History, trends, "readings today" and out-of-range checks key off taken_at.
-- =============================================================================

alter table public.chemical_logs add column if not exists taken_at timestamptz;

-- Backfill existing rows: assume they were taken when they were recorded.
update public.chemical_logs set taken_at = created_at where taken_at is null;

-- New rows default to now() if the client doesn't send an explicit taken-at.
alter table public.chemical_logs alter column taken_at set default now();

create index if not exists idx_chem_taken_at on public.chemical_logs(facility_id, taken_at);
