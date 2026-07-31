-- =============================================================================
-- PoolOps Pro — org DM toggle RPC (Fix 7 persistence). Run AFTER schema.sql,
-- rls-policies.sql, and chat.sql (which adds organizations.dms_disabled). Idempotent.
--
-- The clients don't know their org's uuid, so writing organizations.dms_disabled
-- goes through this RPC, which enforces the permission SERVER-side (only an org admin
-- may flip it) and scopes the update to the caller's org via current_org_id().
-- =============================================================================

create or replace function public.set_org_dms(disabled boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_org_admin() then
    raise exception 'Only an org admin can change the direct-message setting';
  end if;
  update public.organizations set dms_disabled = disabled where id = public.current_org_id();
end$$;
