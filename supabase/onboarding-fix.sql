-- =============================================================================
-- PoolOps Pro — onboarding step persistence (Fix 1). Run AFTER schema.sql. Idempotent.
--
-- Onboarding progress is one row per (staff, step). This unique index lets the client
-- upsert a step's status (ON CONFLICT (staff_id, step)) so a step update persists in
-- place instead of duplicating or being lost.
-- =============================================================================

create unique index if not exists idx_onboarding_staff_step
  on public.onboarding_submissions(staff_id, step);
