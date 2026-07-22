-- =============================================================================
-- PoolOps Pro — Storage buckets & policies
-- Run AFTER schema.sql. Creates PRIVATE buckets and access policies.
--
-- ⚠️  ALL buckets here are PRIVATE. Sensitive documents (tax forms, I-9, payroll)
--     must NEVER be public. Serve files with short-lived SIGNED URLs generated
--     server-side. See SECURITY.md.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Create buckets (id, name, public=false). Re-runnable.
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values
  ('staff-documents',     'staff-documents',     false),
  ('certifications',      'certifications',      false),
  ('maintenance-photos',  'maintenance-photos',  false),
  ('inspection-photos',   'inspection-photos',   false),
  ('profile-avatars',     'profile-avatars',     false),
  ('organization-assets', 'organization-assets', false)
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- Policies on storage.objects.
-- Convention: object path is prefixed with the org id, e.g.
--   staff-documents/<org_id>/<staff_id>/w4.pdf
-- so we can scope access by the first path segment.
-- These call the helper functions defined in rls-policies.sql.
-- -----------------------------------------------------------------------------

-- staff-documents: SENSITIVE. Only HR/admin/payroll may read/write. (Tax forms!)
drop policy if exists staff_docs_rw on storage.objects;
create policy staff_docs_rw on storage.objects for all
  using (
    bucket_id = 'staff-documents'
    and public.has_role('super_admin','org_admin','hr_coordinator','payroll_team')
  )
  with check (
    bucket_id = 'staff-documents'
    and public.has_role('super_admin','org_admin','hr_coordinator','payroll_team')
  );

-- certifications: staff can upload/read their own; managers read all.
drop policy if exists certs_read on storage.objects;
create policy certs_read on storage.objects for select
  using (
    bucket_id = 'certifications'
    and (owner = auth.uid()
         or public.has_role('super_admin','org_admin','lifeguard_manager','hr_coordinator'))
  );
drop policy if exists certs_upload on storage.objects;
create policy certs_upload on storage.objects for insert
  with check (bucket_id = 'certifications' and owner = auth.uid());

-- maintenance-photos: any authenticated org member can read/upload.
drop policy if exists maint_photos_rw on storage.objects;
create policy maint_photos_rw on storage.objects for all
  using (bucket_id = 'maintenance-photos' and auth.role() = 'authenticated')
  with check (bucket_id = 'maintenance-photos' and auth.role() = 'authenticated');

-- inspection-photos: compliance roles read/write.
drop policy if exists inspection_photos_rw on storage.objects;
create policy inspection_photos_rw on storage.objects for all
  using (
    bucket_id = 'inspection-photos'
    and public.has_role('super_admin','org_admin','ops_manager','lifeguard_manager','auditor')
  )
  with check (bucket_id = 'inspection-photos' and auth.role() = 'authenticated');

-- profile-avatars: a user manages their own avatar; anyone authenticated can read.
drop policy if exists avatars_read on storage.objects;
create policy avatars_read on storage.objects for select
  using (bucket_id = 'profile-avatars' and auth.role() = 'authenticated');
drop policy if exists avatars_write on storage.objects;
create policy avatars_write on storage.objects for all
  using (bucket_id = 'profile-avatars' and owner = auth.uid())
  with check (bucket_id = 'profile-avatars' and owner = auth.uid());

-- organization-assets (logos, handbooks): admins write, org members read.
drop policy if exists org_assets_read on storage.objects;
create policy org_assets_read on storage.objects for select
  using (bucket_id = 'organization-assets' and auth.role() = 'authenticated');
drop policy if exists org_assets_write on storage.objects;
create policy org_assets_write on storage.objects for all
  using (bucket_id = 'organization-assets' and public.is_org_admin())
  with check (bucket_id = 'organization-assets' and public.is_org_admin());

-- =============================================================================
-- PRODUCTION WARNINGS
-- -----------------------------------------------------------------------------
-- 1. Never make any of these buckets public. Tax/I-9/SSN documents are PII.
-- 2. Always serve files via signed URLs (createSignedUrl) generated server-side
--    with a short TTL. Do not expose long-lived public URLs.
-- 3. Encrypt sensitive documents at rest beyond Supabase defaults where your
--    compliance regime (e.g. IRS, state labor) requires it.
-- 4. Add virus scanning / file-type validation before accepting uploads.
-- 5. Review owner/path conventions: enforce <org_id>/ prefixes in app code.
-- =============================================================================
