-- =============================================================================
-- PoolOps Pro — FULL SETUP (all 5 files concatenated in order).
-- Paste this whole file into the Supabase SQL Editor and click Run.
-- Generated 2026-07-14T23:12:00Z. Source of truth = the 5 individual files.
-- =============================================================================

-- >>>>>>>>>>>>>>>>>>>> BEGIN schema.sql >>>>>>>>>>>>>>>>>>>>

-- =============================================================================
-- PoolOps Pro — Database schema
-- Run this FIRST in the Supabase SQL editor (Project → SQL → New query).
-- Then run rls-policies.sql, realtime.sql, and storage.sql in that order.
-- Optionally run seed.sql for sample data.
--
-- Safe to re-run: uses IF NOT EXISTS / CREATE OR REPLACE throughout.
-- =============================================================================

create extension if not exists "pgcrypto";          -- gen_random_uuid()

-- -----------------------------------------------------------------------------
-- updated_at trigger helper
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Convenience macro applied to every table with an updated_at column.
-- (Postgres has no macros, so we attach triggers explicitly at the bottom.)

-- =============================================================================
-- CORE: organizations, members, facilities, pools, profiles, roles
-- =============================================================================

create table if not exists public.organizations (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  type          text not null default 'community_pool',
  timezone      text not null default 'America/Chicago',
  season_start  date,
  season_end    date,
  accent_color  text default '#0E7490',
  logo_url      text,
  plan          text not null default 'small',
  billing_status text not null default 'trial',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  first_name    text,
  last_name     text,
  email         text,
  phone         text,
  avatar_color  text default '#0E7490',
  avatar_url    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.roles (
  slug          text primary key,
  name          text not null,
  short_name    text,
  description   text,
  level         int not null default 10
);

create table if not exists public.permissions (
  key           text primary key,
  label         text,
  module        text
);

create table if not exists public.role_permissions (
  role_slug     text references public.roles(slug) on delete cascade,
  permission_key text references public.permissions(key) on delete cascade,
  primary key (role_slug, permission_key)
);

create table if not exists public.organization_members (
  id            uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  profile_id    uuid not null references public.profiles(id) on delete cascade,
  role_slug     text not null references public.roles(slug),
  status        text not null default 'active',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (organization_id, profile_id)
);
create index if not exists idx_org_members_org on public.organization_members(organization_id);
create index if not exists idx_org_members_profile on public.organization_members(profile_id);

create table if not exists public.facilities (
  id            uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name          text not null,
  address       text,
  pool_type     text,
  operating_hours text,
  capacity      int,
  emergency_phone text,
  manager_id    uuid references public.profiles(id) on delete set null,
  status        text not null default 'open',
  chemical_ranges jsonb,
  inspection_required boolean default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_facilities_org on public.facilities(organization_id);

create table if not exists public.pools (
  id            uuid primary key default gen_random_uuid(),
  facility_id   uuid not null references public.facilities(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  name          text not null,
  pool_type     text,
  volume_gallons int,
  max_depth_ft  numeric,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_pools_facility on public.pools(facility_id);

create table if not exists public.staff_profiles (
  id            uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  profile_id    uuid references public.profiles(id) on delete set null,
  first_name    text,
  last_name     text,
  home_facility_id uuid references public.facilities(id) on delete set null,
  facility_ids  uuid[] default '{}',
  primary_role  text references public.roles(slug),
  roles         text[] default '{}',
  title         text,
  age           int,
  is_minor      boolean default false,
  hire_date     date,
  employment_status text default 'active',
  status_flags  text[] default '{active}',
  availability  jsonb,
  preferred_hours_per_week int default 24,
  pay_rate      numeric default 0,            -- payroll-gated
  onboarding_complete int default 0,
  emergency_contact jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  created_by    uuid references public.profiles(id)
);
create index if not exists idx_staff_org on public.staff_profiles(organization_id);
create index if not exists idx_staff_profile on public.staff_profiles(profile_id);
-- Backfill name columns if the table pre-existed from an earlier partial run.
alter table public.staff_profiles add column if not exists first_name text;
alter table public.staff_profiles add column if not exists last_name text;

-- =============================================================================
-- SCHEDULING
-- =============================================================================

create table if not exists public.availability (
  id            uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  staff_id      uuid not null references public.staff_profiles(id) on delete cascade,
  day_of_week   int not null,            -- 0=Mon .. 6=Sun
  start_time    time,
  end_time      time,
  preference    text default 'available',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.time_off_requests (
  id            uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  staff_id      uuid not null references public.staff_profiles(id) on delete cascade,
  start_date    date not null,
  end_date      date not null,
  reason        text,
  type          text default 'vacation',
  status        text not null default 'pending',
  reviewed_by   uuid references public.profiles(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_timeoff_org on public.time_off_requests(organization_id);
create index if not exists idx_timeoff_staff on public.time_off_requests(staff_id);

create table if not exists public.schedule_templates (
  id            uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name          text not null,
  facility_id   uuid references public.facilities(id) on delete cascade,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.schedule_template_requirements (
  id            uuid primary key default gen_random_uuid(),
  template_id   uuid not null references public.schedule_templates(id) on delete cascade,
  facility_id   uuid references public.facilities(id) on delete cascade,
  label         text,
  position      text not null,
  certification_required text,
  days_of_week  int[] default '{}',
  start_time    time,
  end_time      time,
  staff_count   int default 1,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.schedule_drafts (
  id            uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  facility_id   uuid references public.facilities(id) on delete set null,
  week_start    date not null,
  status        text not null default 'draft',  -- draft|needs_review|ready|published|failed
  coverage_score int default 0,
  settings      jsonb,
  warnings      jsonb,
  avoided_conflicts jsonb,
  staff_hour_totals jsonb,
  suggested_fixes jsonb,
  generated_by  uuid references public.profiles(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_drafts_org on public.schedule_drafts(organization_id);

create table if not exists public.schedule_draft_shifts (
  id            uuid primary key default gen_random_uuid(),
  draft_id      uuid not null references public.schedule_drafts(id) on delete cascade,
  facility_id   uuid references public.facilities(id) on delete set null,
  shift_date    date not null,
  position      text not null,
  certification_required text,
  start_time    time,
  end_time      time,
  hours         numeric,
  label         text,
  assigned_staff_id uuid references public.staff_profiles(id) on delete set null,
  is_open_shift boolean default false,
  warnings      jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_draft_shifts_draft on public.schedule_draft_shifts(draft_id);

create table if not exists public.shifts (
  id            uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  facility_id   uuid not null references public.facilities(id) on delete cascade,
  position      text not null,
  shift_date    date not null,
  start_time    time not null,
  end_time      time not null,
  assigned_staff_id uuid references public.staff_profiles(id) on delete set null,
  status        text not null default 'open',
  notes         text,
  published_from_draft uuid references public.schedule_drafts(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  created_by    uuid references public.profiles(id)
);
create index if not exists idx_shifts_org on public.shifts(organization_id);
create index if not exists idx_shifts_facility_date on public.shifts(facility_id, shift_date);
create index if not exists idx_shifts_staff on public.shifts(assigned_staff_id);

create table if not exists public.shift_assignments (
  id            uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  shift_id      uuid not null references public.shifts(id) on delete cascade,
  staff_id      uuid not null references public.staff_profiles(id) on delete cascade,
  assigned_by   uuid references public.profiles(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_assignments_shift on public.shift_assignments(shift_id);

create table if not exists public.shift_trade_requests (
  id            uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  shift_id      uuid not null references public.shifts(id) on delete cascade,
  requested_by  uuid not null references public.staff_profiles(id) on delete cascade,
  requested_to  uuid references public.staff_profiles(id) on delete set null,
  reason        text,
  status        text not null default 'pending',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.schedule_publish_events (
  id            uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  draft_id      uuid references public.schedule_drafts(id) on delete set null,
  week_start    date,
  published_by  uuid references public.profiles(id),
  assigned_count int default 0,
  open_count    int default 0,
  posted_to_chat boolean default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- =============================================================================
-- TIME CLOCK & PAYROLL
-- =============================================================================

create table if not exists public.time_clock_entries (
  id            uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  facility_id   uuid references public.facilities(id) on delete set null,
  staff_id      uuid not null references public.staff_profiles(id) on delete cascade,
  clock_in      timestamptz,
  clock_out     timestamptz,
  break_minutes int default 0,
  status        text default 'clocked_in',
  flagged       boolean default false,
  note          text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_clock_org on public.time_clock_entries(organization_id);
create index if not exists idx_clock_staff on public.time_clock_entries(staff_id);

create table if not exists public.pay_periods (
  id            uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  label         text,
  start_date    date,
  end_date      date,
  status        text default 'needs_review',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.payroll_reviews (
  id            uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  pay_period_id uuid references public.pay_periods(id) on delete cascade,
  staff_id      uuid references public.staff_profiles(id) on delete cascade,
  regular_hours numeric default 0,
  overtime_hours numeric default 0,
  status        text default 'ready',
  has_missing_punch boolean default false,
  note          text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.payroll_exports (
  id            uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  pay_period_id uuid references public.pay_periods(id) on delete set null,
  format        text default 'csv',
  row_count     int default 0,
  created_by    uuid references public.profiles(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- =============================================================================
-- ONBOARDING & DOCUMENTS
-- =============================================================================

create table if not exists public.onboarding_tasks (
  id            uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  key           text not null,
  title         text,
  description   text,
  required      boolean default true,
  sort_order    int default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.onboarding_submissions (
  id            uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  staff_id      uuid not null references public.staff_profiles(id) on delete cascade,
  step          text not null,
  status        text default 'not_started',
  reviewed_by   uuid references public.profiles(id),
  submitted_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.document_categories (
  id            uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  key           text not null,
  label         text,
  sensitive     boolean default false
);

create table if not exists public.documents (
  id            uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name          text not null,
  category      text,
  storage_path  text,                       -- path in a PRIVATE storage bucket
  uploaded_by   uuid references public.profiles(id),
  size_kb       int,
  file_type     text,
  tags          text[] default '{}',
  visible_to_roles text[] default '{}',     -- empty = all staff
  requires_acknowledgment boolean default false,
  sensitive     boolean default false,      -- tax forms, payroll, etc.
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_documents_org on public.documents(organization_id);

-- =============================================================================
-- CHAT & NOTIFICATIONS
-- =============================================================================

create table if not exists public.channels (
  id            uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name          text not null,
  kind          text not null default 'all_staff',  -- all_staff|role|facility|admin
  description   text,
  facility_id   uuid references public.facilities(id) on delete cascade,
  restricted_to_roles text[],
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_channels_org on public.channels(organization_id);

create table if not exists public.channel_members (
  channel_id    uuid references public.channels(id) on delete cascade,
  profile_id    uuid references public.profiles(id) on delete cascade,
  last_read_at  timestamptz,
  primary key (channel_id, profile_id)
);

create table if not exists public.messages (
  id            uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  channel_id    uuid not null references public.channels(id) on delete cascade,
  sender_id     uuid references public.profiles(id) on delete set null,
  body          text not null,
  pinned        boolean default false,
  priority      text default 'normal',       -- normal|urgent
  kind          text default 'message',
  template      text,
  link_url      text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_messages_channel on public.messages(channel_id, created_at);
create index if not exists idx_messages_org on public.messages(organization_id);

create table if not exists public.message_reads (
  message_id    uuid references public.messages(id) on delete cascade,
  profile_id    uuid references public.profiles(id) on delete cascade,
  read_at       timestamptz not null default now(),
  primary key (message_id, profile_id)
);

create table if not exists public.announcements (
  id            uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  channel_id    uuid references public.channels(id) on delete set null,
  title         text,
  body          text,
  priority      text default 'normal',
  kind          text default 'announcement',
  created_by    uuid references public.profiles(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.notifications (
  id            uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  user_id       uuid references public.profiles(id) on delete cascade,
  kind          text default 'system',
  title         text,
  body          text,
  href          text,
  read          boolean default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_notifications_user on public.notifications(user_id);

-- =============================================================================
-- OPERATIONS
-- =============================================================================

create table if not exists public.certifications (
  type          text primary key,
  name          text,
  issuing_body  text,
  valid_months  int
);

create table if not exists public.staff_certifications (
  id            uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  staff_id      uuid not null references public.staff_profiles(id) on delete cascade,
  type          text not null,
  issued_date   date,
  expires_date  date,
  status        text default 'valid',
  cert_number   text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_staff_certs_staff on public.staff_certifications(staff_id);

create table if not exists public.chemical_logs (
  id            uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  facility_id   uuid not null references public.facilities(id) on delete cascade,
  pool_id       uuid references public.pools(id) on delete set null,
  recorded_by   uuid references public.profiles(id),
  free_chlorine numeric,
  combined_chlorine numeric,
  ph            numeric,
  alkalinity    numeric,
  calcium_hardness numeric,
  cyanuric_acid numeric,
  water_temp    numeric,
  notes         text,
  corrective_action text,
  out_of_range  text[] default '{}',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_chem_facility on public.chemical_logs(facility_id, created_at);

create table if not exists public.checklist_templates (
  id            uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name          text,
  kind          text,
  cadence       text,
  facility_ids  uuid[] default '{}',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.checklist_items (
  id            uuid primary key default gen_random_uuid(),
  template_id   uuid not null references public.checklist_templates(id) on delete cascade,
  label         text,
  requires_note boolean default false,
  sort_order    int default 0
);

create table if not exists public.checklist_completions (
  id            uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  template_id   uuid references public.checklist_templates(id) on delete set null,
  facility_id   uuid references public.facilities(id) on delete set null,
  completed_by  uuid references public.profiles(id),
  status        text default 'complete',
  checked_item_ids uuid[] default '{}',
  note          text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.shift_reports (
  id            uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  facility_id   uuid references public.facilities(id) on delete set null,
  staff_id      uuid references public.staff_profiles(id) on delete set null,
  shift_label   text,
  report_date   date,
  weather       text,
  staffing_notes text,
  incidents     text,
  maintenance_concerns text,
  patron_issues text,
  supplies_needed text,
  manager_notes text,
  review_status text default 'submitted',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.patron_counts (
  id            uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  facility_id   uuid references public.facilities(id) on delete cascade,
  recorded_by   uuid references public.profiles(id),
  time_slot     text,
  count         int default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.maintenance_issues (
  id            uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  facility_id   uuid references public.facilities(id) on delete cascade,
  area          text,
  title         text not null,
  description   text,
  priority      text default 'medium',
  status        text default 'new',
  reported_by   uuid references public.profiles(id),
  assigned_to   uuid references public.staff_profiles(id) on delete set null,
  due_date      date,
  photo_path    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_maint_facility on public.maintenance_issues(facility_id);

create table if not exists public.inspection_templates (
  id            uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  name          text,
  feature       text,
  cadence_days  int,
  checkpoints   text[] default '{}'
);

create table if not exists public.inspection_results (
  id            uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  template_id   uuid references public.inspection_templates(id) on delete set null,
  facility_id   uuid references public.facilities(id) on delete set null,
  inspected_by  uuid references public.profiles(id),
  result        text default 'pass',
  notes         text,
  photo_path    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- =============================================================================
-- LESSONS & MEMBERS
-- =============================================================================

create table if not exists public.lesson_classes (
  id            uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  facility_id   uuid references public.facilities(id) on delete set null,
  name          text,
  level         text,
  instructor_id uuid references public.staff_profiles(id) on delete set null,
  day_of_week   text,
  start_time    time,
  end_time      time,
  capacity      int,
  enrolled      int default 0,
  start_date    date,
  end_date      date,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.lesson_registrations (
  id            uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  class_id      uuid references public.lesson_classes(id) on delete cascade,
  member_id     uuid,
  student_name  text,
  student_age   int,
  attendance    jsonb,
  progress_notes jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.households (
  id            uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name          text,
  primary_contact text,
  email         text,
  phone         text,
  address       text,
  membership_status text default 'active',
  waiver_signed boolean default false,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.members (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid references public.households(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  first_name    text,
  last_name     text,
  age           int,
  is_primary    boolean default false,
  emergency_contact jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- =============================================================================
-- BUSINESS: subscriptions, setup packages, invoices, quotes
-- =============================================================================

create table if not exists public.subscription_plans (
  tier          text primary key,           -- small|medium|big
  name          text,
  monthly_price numeric,
  annual_price  numeric,
  limits        jsonb,
  features      text[]
);

create table if not exists public.organization_subscriptions (
  id            uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  plan_tier     text references public.subscription_plans(tier),
  billing_status text default 'trial',
  billing_cycle text default 'monthly',
  current_period_end date,
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.setup_packages (
  tier          text primary key,           -- starter|guided|premium
  name          text,
  price         numeric,
  summary       text
);

create table if not exists public.invoices (
  id            uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  number        text,
  amount        numeric,
  status        text default 'open',         -- paid|open|void
  plan          text,
  stripe_invoice_id text,
  issued_at     date,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.quote_requests (
  id            uuid primary key default gen_random_uuid(),
  organization_name text,
  contact_name  text,
  email         text,
  phone         text,
  org_type      text,
  facility_count int,
  pool_count    int,
  staff_count   int,
  recommended_plan text,
  modules       text[],
  message       text,
  status        text default 'new',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- =============================================================================
-- SECURITY / AUDIT
-- =============================================================================

create table if not exists public.audit_logs (
  id            uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  actor_id      uuid references public.profiles(id) on delete set null,
  action        text not null,
  target        text,
  sensitive     boolean default false,
  metadata      jsonb,
  created_at    timestamptz not null default now()
);
create index if not exists idx_audit_org on public.audit_logs(organization_id, created_at);

-- =============================================================================
-- USER MANAGEMENT: invitations + delegated management permissions
-- =============================================================================

create table if not exists public.staff_invitations (
  id            uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  email         text not null,
  first_name    text,
  last_name     text,
  role_id       text references public.roles(slug),
  home_facility_id uuid references public.facilities(id) on delete set null,
  invited_by    uuid references public.profiles(id) on delete set null,
  status        text not null default 'draft',   -- draft|sent|pending|accepted|expired|canceled
  invite_token  text,
  token_hash    text,
  expires_at    timestamptz default (now() + interval '14 days'),
  accepted_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_invites_org on public.staff_invitations(organization_id);
create index if not exists idx_invites_email on public.staff_invitations(email);
create index if not exists idx_invites_status on public.staff_invitations(status);

create table if not exists public.user_management_permissions (
  id            uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  user_id       uuid references public.profiles(id) on delete cascade,
  member_id     uuid references public.organization_members(id) on delete cascade,
  can_invite_users boolean default false,
  can_manage_roles boolean default false,
  can_manage_facilities boolean default false,
  can_manage_payroll boolean default false,
  can_manage_onboarding boolean default false,
  can_approve_schedules boolean default false,
  can_deactivate_users boolean default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_ump_org on public.user_management_permissions(organization_id);
create index if not exists idx_ump_user on public.user_management_permissions(user_id);

-- =============================================================================
-- Extra indexes on status / created_at for common filters & ordering
-- =============================================================================
create index if not exists idx_shifts_status on public.shifts(status);
create index if not exists idx_shifts_created on public.shifts(created_at);
create index if not exists idx_drafts_status on public.schedule_drafts(status);
create index if not exists idx_timeoff_status on public.time_off_requests(status);
create index if not exists idx_trades_status on public.shift_trade_requests(status);
create index if not exists idx_maint_status on public.maintenance_issues(status);
create index if not exists idx_maint_created on public.maintenance_issues(created_at);
create index if not exists idx_clock_status on public.time_clock_entries(status);
create index if not exists idx_clock_created on public.time_clock_entries(created_at);
create index if not exists idx_chem_created on public.chemical_logs(created_at);
create index if not exists idx_messages_created on public.messages(created_at);
create index if not exists idx_notifications_read on public.notifications(read);
create index if not exists idx_payroll_reviews_period on public.payroll_reviews(pay_period_id);
create index if not exists idx_onboarding_staff on public.onboarding_submissions(staff_id);
create index if not exists idx_quote_status on public.quote_requests(status);
create index if not exists idx_org_subs_org on public.organization_subscriptions(organization_id);

-- =============================================================================
-- updated_at triggers (attach to every table that has the column)
-- =============================================================================
do $$
declare t text;
begin
  for t in
    select table_name from information_schema.columns
    where table_schema = 'public' and column_name = 'updated_at'
  loop
    execute format('drop trigger if exists set_updated_at on public.%I;', t);
    execute format(
      'create trigger set_updated_at before update on public.%I
       for each row execute function public.set_updated_at();', t);
  end loop;
end$$;

-- Done. Next: rls-policies.sql

-- <<<<<<<<<<<<<<<<<<<< END schema.sql <<<<<<<<<<<<<<<<<<<<

-- >>>>>>>>>>>>>>>>>>>> BEGIN rls-policies.sql >>>>>>>>>>>>>>>>>>>>

-- =============================================================================
-- PoolOps Pro — Row Level Security (RLS) policies (STARTER set)
-- Run AFTER schema.sql.
--
-- ⚠️  These are STARTER policies for a multi-tenant aquatics app. They enforce
--     organization isolation and a few role rules. You MUST review, test, and
--     harden them before production (see SECURITY.md). RBAC shown in the UI is
--     for convenience only — real authorization MUST be enforced here, server-side.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Helper functions (SECURITY DEFINER so policies can call them without recursion)
-- -----------------------------------------------------------------------------

-- The caller's organization (from organization_members).
create or replace function public.current_org_id()
returns uuid language sql stable security definer set search_path = public as $$
  select organization_id from public.organization_members
  where profile_id = auth.uid() and status = 'active'
  limit 1;
$$;

-- The caller's role slug within their org.
create or replace function public.current_role_slug()
returns text language sql stable security definer set search_path = public as $$
  select role_slug from public.organization_members
  where profile_id = auth.uid() and status = 'active'
  limit 1;
$$;

-- True if caller has any of the given roles.
create or replace function public.has_role(variadic slugs text[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.organization_members
    where profile_id = auth.uid() and status = 'active' and role_slug = any(slugs)
  );
$$;

-- True if caller is an org-level admin (manage everything in the org).
create or replace function public.is_org_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role('super_admin','org_admin');
$$;

-- The staff_profiles row id for the caller (their "own" staff record).
create or replace function public.current_staff_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.staff_profiles where profile_id = auth.uid() limit 1;
$$;

-- -----------------------------------------------------------------------------
-- Enable RLS on all app tables
-- -----------------------------------------------------------------------------
do $$
declare t text;
begin
  for t in
    select table_name from information_schema.tables
    where table_schema = 'public' and table_type = 'BASE TABLE'
      and table_name not in ('roles','permissions','role_permissions',
                             'certifications','subscription_plans','setup_packages')
  loop
    execute format('alter table public.%I enable row level security;', t);
  end loop;
end$$;

-- Reference tables: readable by any authenticated user.
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.certifications enable row level security;
alter table public.subscription_plans enable row level security;
alter table public.setup_packages enable row level security;

drop policy if exists ref_roles_read on public.roles;
create policy ref_roles_read on public.roles for select using (auth.role() = 'authenticated');
drop policy if exists ref_perms_read on public.permissions;
create policy ref_perms_read on public.permissions for select using (auth.role() = 'authenticated');
drop policy if exists ref_roleperms_read on public.role_permissions;
create policy ref_roleperms_read on public.role_permissions for select using (auth.role() = 'authenticated');
drop policy if exists ref_certs_read on public.certifications;
create policy ref_certs_read on public.certifications for select using (auth.role() = 'authenticated');
drop policy if exists ref_plans_read on public.subscription_plans;
create policy ref_plans_read on public.subscription_plans for select using (true);
drop policy if exists ref_setup_read on public.setup_packages;
create policy ref_setup_read on public.setup_packages for select using (true);

-- -----------------------------------------------------------------------------
-- Generic org-isolation policies for tables that have organization_id.
-- SELECT: same org. WRITE (insert/update/delete): managers/admins by default.
-- More specific tables get tighter overrides below.
-- -----------------------------------------------------------------------------
do $$
declare t text;
begin
  for t in
    select c.table_name
    from information_schema.columns c
    join information_schema.tables tb
      on tb.table_name = c.table_name and tb.table_schema = 'public'
    where c.table_schema = 'public' and c.column_name = 'organization_id'
      and tb.table_type = 'BASE TABLE'
      and c.table_name not in ('time_off_requests','time_clock_entries','onboarding_submissions',
                               'maintenance_issues','messages','notifications','staff_certifications',
                               'payroll_reviews','payroll_exports','pay_periods','documents','audit_logs',
                               -- self-service tables front-line staff must write to (explicit policies below):
                               'shifts','shift_trade_requests','checklist_completions','patron_counts','shift_reports')
  loop
    execute format('drop policy if exists org_select on public.%I;', t);
    execute format(
      'create policy org_select on public.%I for select
       using (organization_id = public.current_org_id());', t);

    execute format('drop policy if exists org_write on public.%I;', t);
    execute format(
      'create policy org_write on public.%I for all
       using (organization_id = public.current_org_id() and public.has_role(
              ''super_admin'',''org_admin'',''ops_manager'',''lifeguard_manager'',
              ''scheduling_manager'',''hr_coordinator''))
       with check (organization_id = public.current_org_id());', t);
  end loop;
end$$;

-- -----------------------------------------------------------------------------
-- profiles: a user sees their own profile + others in their org; edits own.
-- -----------------------------------------------------------------------------
drop policy if exists profiles_self on public.profiles;
create policy profiles_self on public.profiles for select
  using (id = auth.uid() or organization_id = public.current_org_id());
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

-- organization_members: visible within org; managed by admins.
drop policy if exists members_select on public.organization_members;
create policy members_select on public.organization_members for select
  using (organization_id = public.current_org_id());
drop policy if exists members_admin on public.organization_members;
create policy members_admin on public.organization_members for all
  using (organization_id = public.current_org_id() and public.is_org_admin())
  with check (organization_id = public.current_org_id());

-- organizations: members can read their org; admins update.
drop policy if exists org_read on public.organizations;
create policy org_read on public.organizations for select
  using (id = public.current_org_id());
drop policy if exists org_admin_update on public.organizations;
create policy org_admin_update on public.organizations for update
  using (id = public.current_org_id() and public.is_org_admin());

-- -----------------------------------------------------------------------------
-- LOWEST-LEVEL STAFF rules
-- -----------------------------------------------------------------------------

-- staff_profiles: everyone in org can see basic roster; staff edit only their own;
-- managers/HR manage all. (pay_rate column is sensitive — restrict via a view or
-- column privileges in production; see SECURITY.md.)
drop policy if exists staff_select on public.staff_profiles;
create policy staff_select on public.staff_profiles for select
  using (organization_id = public.current_org_id());
drop policy if exists staff_self_update on public.staff_profiles;
create policy staff_self_update on public.staff_profiles for update
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());
drop policy if exists staff_manage on public.staff_profiles;
create policy staff_manage on public.staff_profiles for all
  using (organization_id = public.current_org_id()
         and public.has_role('super_admin','org_admin','hr_coordinator','ops_manager'))
  with check (organization_id = public.current_org_id());

-- time_off_requests: staff see/insert their OWN; managers see all & approve.
drop policy if exists timeoff_self_select on public.time_off_requests;
create policy timeoff_self_select on public.time_off_requests for select
  using (organization_id = public.current_org_id()
         and (staff_id = public.current_staff_id()
              or public.has_role('super_admin','org_admin','ops_manager',
                                 'lifeguard_manager','scheduling_manager')));
drop policy if exists timeoff_self_insert on public.time_off_requests;
create policy timeoff_self_insert on public.time_off_requests for insert
  with check (organization_id = public.current_org_id() and staff_id = public.current_staff_id());
drop policy if exists timeoff_manager_update on public.time_off_requests;
create policy timeoff_manager_update on public.time_off_requests for update
  using (organization_id = public.current_org_id()
         and public.has_role('super_admin','org_admin','ops_manager',
                             'lifeguard_manager','scheduling_manager'));

-- time_clock_entries: staff clock THEMSELVES; payroll/managers see all.
drop policy if exists clock_self_select on public.time_clock_entries;
create policy clock_self_select on public.time_clock_entries for select
  using (organization_id = public.current_org_id()
         and (staff_id = public.current_staff_id()
              or public.has_role('super_admin','org_admin','ops_manager',
                                 'lifeguard_manager','payroll_team')));
drop policy if exists clock_self_write on public.time_clock_entries;
create policy clock_self_write on public.time_clock_entries for insert
  with check (organization_id = public.current_org_id() and staff_id = public.current_staff_id());
drop policy if exists clock_self_update on public.time_clock_entries;
create policy clock_self_update on public.time_clock_entries for update
  using (organization_id = public.current_org_id()
         and (staff_id = public.current_staff_id()
              or public.has_role('super_admin','org_admin','payroll_team','ops_manager')));

-- onboarding_submissions: staff complete their OWN; HR/admin manage all.
drop policy if exists onboarding_self on public.onboarding_submissions;
create policy onboarding_self on public.onboarding_submissions for select
  using (organization_id = public.current_org_id()
         and (staff_id = public.current_staff_id()
              or public.has_role('super_admin','org_admin','hr_coordinator')));
drop policy if exists onboarding_self_write on public.onboarding_submissions;
create policy onboarding_self_write on public.onboarding_submissions for all
  using (organization_id = public.current_org_id()
         and (staff_id = public.current_staff_id()
              or public.has_role('super_admin','org_admin','hr_coordinator')))
  with check (organization_id = public.current_org_id());

-- maintenance_issues: any staff can REPORT (insert) & view; managers/maintenance manage.
drop policy if exists maint_select on public.maintenance_issues;
create policy maint_select on public.maintenance_issues for select
  using (organization_id = public.current_org_id());
drop policy if exists maint_report on public.maintenance_issues;
create policy maint_report on public.maintenance_issues for insert
  with check (organization_id = public.current_org_id());
drop policy if exists maint_manage on public.maintenance_issues;
create policy maint_manage on public.maintenance_issues for update
  using (organization_id = public.current_org_id()
         and public.has_role('super_admin','org_admin','ops_manager','lifeguard_manager','maintenance'));

-- messages: all org members READ All-Team & channels; announce roles post.
-- (Channel-level restriction is enforced in app logic + channel.restricted_to_roles.)
drop policy if exists messages_read on public.messages;
create policy messages_read on public.messages for select
  using (organization_id = public.current_org_id());
drop policy if exists messages_post on public.messages;
create policy messages_post on public.messages for insert
  with check (organization_id = public.current_org_id() and sender_id = auth.uid());
drop policy if exists messages_pin on public.messages;
create policy messages_pin on public.messages for update
  using (organization_id = public.current_org_id()
         and public.has_role('super_admin','org_admin','ops_manager',
                             'lifeguard_manager','scheduling_manager','hr_coordinator','payroll_team'));

-- notifications: a user only sees & updates their OWN notifications.
drop policy if exists notif_self on public.notifications;
create policy notif_self on public.notifications for select
  using (user_id = auth.uid());
drop policy if exists notif_self_update on public.notifications;
create policy notif_self_update on public.notifications for update
  using (user_id = auth.uid());

-- staff_certifications: viewable in org by managers/compliance; staff see own.
drop policy if exists certs_select on public.staff_certifications;
create policy certs_select on public.staff_certifications for select
  using (organization_id = public.current_org_id()
         and (staff_id = public.current_staff_id()
              or public.has_role('super_admin','org_admin','ops_manager',
                                 'lifeguard_manager','hr_coordinator','auditor')));
drop policy if exists certs_manage on public.staff_certifications;
create policy certs_manage on public.staff_certifications for all
  using (organization_id = public.current_org_id()
         and public.has_role('super_admin','org_admin','lifeguard_manager','hr_coordinator'))
  with check (organization_id = public.current_org_id());

-- -----------------------------------------------------------------------------
-- PAYROLL / PAYMENT TEAM rules — payroll roles only (NOT lowest-level staff)
-- -----------------------------------------------------------------------------
do $$
declare t text;
begin
  for t in select unnest(array['pay_periods','payroll_reviews','payroll_exports']) loop
    execute format('drop policy if exists payroll_read on public.%I;', t);
    execute format(
      'create policy payroll_read on public.%I for select
       using (organization_id = public.current_org_id()
              and public.has_role(''super_admin'',''org_admin'',''payroll_team''));', t);
    execute format('drop policy if exists payroll_write on public.%I;', t);
    execute format(
      'create policy payroll_write on public.%I for all
       using (organization_id = public.current_org_id()
              and public.has_role(''super_admin'',''org_admin'',''payroll_team''))
       with check (organization_id = public.current_org_id());', t);
  end loop;
end$$;

-- documents: tax/payroll/sensitive docs restricted; others visible in org.
drop policy if exists documents_select on public.documents;
create policy documents_select on public.documents for select
  using (
    organization_id = public.current_org_id()
    and (
      sensitive = false
      or public.has_role('super_admin','org_admin','hr_coordinator','payroll_team')
      or public.current_role_slug() = any(visible_to_roles)
    )
  );
drop policy if exists documents_manage on public.documents;
create policy documents_manage on public.documents for all
  using (organization_id = public.current_org_id()
         and public.has_role('super_admin','org_admin','hr_coordinator'))
  with check (organization_id = public.current_org_id());

-- audit_logs: only admins read; any authenticated action can insert.
drop policy if exists audit_read on public.audit_logs;
create policy audit_read on public.audit_logs for select
  using (organization_id = public.current_org_id() and public.is_org_admin());
drop policy if exists audit_insert on public.audit_logs;
create policy audit_insert on public.audit_logs for insert
  with check (organization_id = public.current_org_id());

-- quote_requests: public can submit (marketing form); admins read.
drop policy if exists quote_insert on public.quote_requests;
create policy quote_insert on public.quote_requests for insert with check (true);
drop policy if exists quote_read on public.quote_requests;
create policy quote_read on public.quote_requests for select
  using (public.has_role('super_admin','org_admin'));

-- -----------------------------------------------------------------------------
-- SCHEDULING & OPERATIONS SELF-SERVICE  (hardening added 2026-07-13)
-- The generic manager-only write policy is too strict for tables front-line staff
-- must write to: claim an open shift, request a swap, complete a checklist, log a
-- patron count, submit a shift report. These tables are excluded from the generic
-- loop above and get explicit self-service + manager policies here. Two draft/
-- template tables have no organization_id and are scoped through their parent.
-- -----------------------------------------------------------------------------

-- shifts: whole org can view; managers manage; a staff member may CLAIM an OPEN shift for themselves.
drop policy if exists shifts_select on public.shifts;
create policy shifts_select on public.shifts for select
  using (organization_id = public.current_org_id());
drop policy if exists shifts_manage on public.shifts;
create policy shifts_manage on public.shifts for all
  using (organization_id = public.current_org_id()
         and public.has_role('super_admin','org_admin','ops_manager','lifeguard_manager','scheduling_manager'))
  with check (organization_id = public.current_org_id());
drop policy if exists shifts_claim_open on public.shifts;
create policy shifts_claim_open on public.shifts for update
  using (organization_id = public.current_org_id() and status = 'open')
  with check (organization_id = public.current_org_id() and assigned_staff_id = public.current_staff_id());

-- shift_trade_requests: staff see & insert their OWN; the named sub sees theirs; managers see all & approve.
drop policy if exists trades_select on public.shift_trade_requests;
create policy trades_select on public.shift_trade_requests for select
  using (organization_id = public.current_org_id()
         and (requested_by = public.current_staff_id()
              or requested_to = public.current_staff_id()
              or public.has_role('super_admin','org_admin','ops_manager','lifeguard_manager','scheduling_manager')));
drop policy if exists trades_insert on public.shift_trade_requests;
create policy trades_insert on public.shift_trade_requests for insert
  with check (organization_id = public.current_org_id() and requested_by = public.current_staff_id());
drop policy if exists trades_manage on public.shift_trade_requests;
create policy trades_manage on public.shift_trade_requests for update
  using (organization_id = public.current_org_id()
         and public.has_role('super_admin','org_admin','ops_manager','lifeguard_manager','scheduling_manager'));

-- schedule_draft_shifts: no organization_id — scope through the parent draft.
drop policy if exists draft_shifts_select on public.schedule_draft_shifts;
create policy draft_shifts_select on public.schedule_draft_shifts for select
  using (exists (select 1 from public.schedule_drafts d
                 where d.id = draft_id and d.organization_id = public.current_org_id()));
drop policy if exists draft_shifts_manage on public.schedule_draft_shifts;
create policy draft_shifts_manage on public.schedule_draft_shifts for all
  using (exists (select 1 from public.schedule_drafts d
                 where d.id = draft_id and d.organization_id = public.current_org_id()
                   and public.has_role('super_admin','org_admin','ops_manager','lifeguard_manager','scheduling_manager')))
  with check (exists (select 1 from public.schedule_drafts d
                 where d.id = draft_id and d.organization_id = public.current_org_id()));

-- schedule_template_requirements: no organization_id — scope through the parent template.
drop policy if exists tmpl_req_select on public.schedule_template_requirements;
create policy tmpl_req_select on public.schedule_template_requirements for select
  using (exists (select 1 from public.schedule_templates t
                 where t.id = template_id and t.organization_id = public.current_org_id()));
drop policy if exists tmpl_req_manage on public.schedule_template_requirements;
create policy tmpl_req_manage on public.schedule_template_requirements for all
  using (exists (select 1 from public.schedule_templates t
                 where t.id = template_id and t.organization_id = public.current_org_id()
                   and public.has_role('super_admin','org_admin','ops_manager','lifeguard_manager','scheduling_manager')))
  with check (exists (select 1 from public.schedule_templates t
                 where t.id = template_id and t.organization_id = public.current_org_id()));

-- checklist_completions: whole org can view; any staff completes their OWN; managers manage.
drop policy if exists checklist_select on public.checklist_completions;
create policy checklist_select on public.checklist_completions for select
  using (organization_id = public.current_org_id());
drop policy if exists checklist_complete on public.checklist_completions;
create policy checklist_complete on public.checklist_completions for insert
  with check (organization_id = public.current_org_id() and completed_by = auth.uid());
drop policy if exists checklist_manage on public.checklist_completions;
create policy checklist_manage on public.checklist_completions for update
  using (organization_id = public.current_org_id()
         and public.has_role('super_admin','org_admin','ops_manager','lifeguard_manager'));

-- patron_counts: whole org can view; staff on deck log counts; managers manage.
drop policy if exists patron_select on public.patron_counts;
create policy patron_select on public.patron_counts for select
  using (organization_id = public.current_org_id());
drop policy if exists patron_insert on public.patron_counts;
create policy patron_insert on public.patron_counts for insert
  with check (organization_id = public.current_org_id() and recorded_by = auth.uid());
drop policy if exists patron_manage on public.patron_counts;
create policy patron_manage on public.patron_counts for update
  using (organization_id = public.current_org_id()
         and public.has_role('super_admin','org_admin','ops_manager','lifeguard_manager'));

-- shift_reports: whole org can view; staff submit their OWN; managers review (update).
drop policy if exists reports_select on public.shift_reports;
create policy reports_select on public.shift_reports for select
  using (organization_id = public.current_org_id());
drop policy if exists reports_submit on public.shift_reports;
create policy reports_submit on public.shift_reports for insert
  with check (organization_id = public.current_org_id() and staff_id = public.current_staff_id());
drop policy if exists reports_review on public.shift_reports;
create policy reports_review on public.shift_reports for update
  using (organization_id = public.current_org_id()
         and public.has_role('super_admin','org_admin','ops_manager','lifeguard_manager'));

-- Done. Next: realtime.sql

-- <<<<<<<<<<<<<<<<<<<< END rls-policies.sql <<<<<<<<<<<<<<<<<<<<

-- >>>>>>>>>>>>>>>>>>>> BEGIN realtime.sql >>>>>>>>>>>>>>>>>>>>

-- =============================================================================
-- PoolOps Pro — Realtime configuration
-- Run AFTER schema.sql (RLS recommended first too).
--
-- Adds the listed tables to the `supabase_realtime` publication so the web and
-- mobile clients receive INSERT/UPDATE/DELETE events. The shared subscription
-- helpers live in packages/supabase/src/realtime.ts.
--
-- You can also toggle Realtime per-table in the dashboard:
--   Database → Replication → supabase_realtime → add tables.
-- =============================================================================

-- Ensure the publication exists (Supabase creates it by default).
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end$$;

-- Helper: add a table to the publication only if not already present.
create or replace function public._add_to_realtime(tbl text)
returns void language plpgsql as $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = tbl
  ) then
    execute format('alter publication supabase_realtime add table public.%I;', tbl);
  end if;
end$$;

select public._add_to_realtime('messages');
select public._add_to_realtime('announcements');
select public._add_to_realtime('channels');
select public._add_to_realtime('shifts');
select public._add_to_realtime('shift_assignments');
select public._add_to_realtime('schedule_drafts');
select public._add_to_realtime('schedule_draft_shifts');
select public._add_to_realtime('schedule_publish_events');
select public._add_to_realtime('time_off_requests');
select public._add_to_realtime('shift_trade_requests');
select public._add_to_realtime('time_clock_entries');
select public._add_to_realtime('chemical_logs');
select public._add_to_realtime('checklist_completions');
select public._add_to_realtime('maintenance_issues');
select public._add_to_realtime('notifications');
select public._add_to_realtime('facilities');
select public._add_to_realtime('staff_invitations');
select public._add_to_realtime('organization_members');

drop function public._add_to_realtime(text);

-- Optional: ensure UPDATE/DELETE payloads include the full old row (needed if you
-- filter on columns that change). REPLICA IDENTITY FULL costs more WAL — enable
-- only where you need it.
-- alter table public.shifts replica identity full;
-- alter table public.schedule_draft_shifts replica identity full;

-- Done. Next: storage.sql

-- <<<<<<<<<<<<<<<<<<<< END realtime.sql <<<<<<<<<<<<<<<<<<<<

-- >>>>>>>>>>>>>>>>>>>> BEGIN storage.sql >>>>>>>>>>>>>>>>>>>>

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

-- <<<<<<<<<<<<<<<<<<<< END storage.sql <<<<<<<<<<<<<<<<<<<<

-- >>>>>>>>>>>>>>>>>>>> BEGIN seed.sql >>>>>>>>>>>>>>>>>>>>

-- =============================================================================
-- PoolOps Pro — Seed data (reference + a demo organization)
-- Run AFTER schema.sql (and ideally rls-policies.sql).
--
-- This seeds:
--   • the 12 roles + permission catalog
--   • subscription plans + setup packages
--   • certification catalog
--   • one demo organization ("Tide & Town Aquatics") with facilities & channels
--
-- Staff rows tied to real auth users are NOT seeded here (they require auth.users
-- entries). Create those via Auth signup, then link with organization_members.
-- The web/mobile apps also run fully in MOCK mode with rich bundled demo data.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Roles (the 12 access levels)
-- -----------------------------------------------------------------------------
insert into public.roles (slug, name, short_name, level) values
  ('super_admin',        'Platform Owner / Super Admin',     'Super Admin',  100),
  ('org_admin',          'Organization Admin / Pool Director','Org Admin',    90),
  ('ops_manager',        'Operations Manager',               'Ops Manager',  70),
  ('lifeguard_manager',  'Lifeguard / Aquatics Manager',     'Guard Manager',65),
  ('scheduling_manager', 'Scheduling Manager',               'Scheduler',    60),
  ('payroll_team',       'Payroll / Payment Team',           'Payroll',      55),
  ('hr_coordinator',     'HR / Onboarding Coordinator',      'HR',           55),
  ('head_lifeguard',     'Head Lifeguard',                   'Head Guard',   30),
  ('swim_instructor',    'Swim Instructor',                  'Instructor',   25),
  ('maintenance',        'Maintenance Staff',                'Maintenance',  20),
  ('lifeguard',          'Lifeguard / Staff',                'Lifeguard',    10),
  ('auditor',            'Read-Only Auditor / Inspector',    'Auditor',      15)
on conflict (slug) do nothing;

-- -----------------------------------------------------------------------------
-- Permission catalog (keys match packages/shared/src/rbac/permissions.ts)
-- -----------------------------------------------------------------------------
insert into public.permissions (key, label, module) values
  ('dashboard.view','View dashboard','General'),
  ('reports.view','View reports','General'),
  ('settings.view','View settings','General'),
  ('settings.manage','Edit settings','General'),
  ('roles.manage','Manage roles','General'),
  ('permissions.manage','Manage permissions','General'),
  ('platform.manage','Manage platform','General'),
  ('facilities.view','View facilities','Facilities'),
  ('facilities.manage','Manage facilities','Facilities'),
  ('staff.view','View staff','Staff'),
  ('staff.manage','Edit staff','Staff'),
  ('staff.invite','Invite staff','Staff'),
  ('onboarding.view','View onboarding','Onboarding'),
  ('onboarding.manage','Manage onboarding','Onboarding'),
  ('onboarding.self','Complete own onboarding','Onboarding'),
  ('chat.view','Read chat','Communication'),
  ('chat.announce','Post announcements','Communication'),
  ('schedule.view','View schedule','Scheduling'),
  ('schedule.self','View own schedule','Scheduling'),
  ('schedule.manage','Manage shifts','Scheduling'),
  ('schedule.approve','Approve trades & time-off','Scheduling'),
  ('timeclock.self','Clock self in/out','Time & Pay'),
  ('timeclock.manage','Manage time entries','Time & Pay'),
  ('payroll.view','View payroll','Time & Pay'),
  ('payroll.manage','Approve timesheets','Time & Pay'),
  ('payroll.export','Export payroll','Time & Pay'),
  ('certifications.view','View certifications','Compliance'),
  ('certifications.manage','Manage certifications','Compliance'),
  ('inspections.view','View inspections','Compliance'),
  ('inspections.manage','Run inspections','Compliance'),
  ('chemicals.view','View chemical logs','Operations'),
  ('chemicals.log','Record chemical logs','Operations'),
  ('checklists.view','View checklists','Operations'),
  ('checklists.complete','Complete checklists','Operations'),
  ('checklists.manage','Manage checklist templates','Operations'),
  ('shiftreports.view','View shift reports','Operations'),
  ('shiftreports.submit','Submit shift reports','Operations'),
  ('shiftreports.review','Review shift reports','Operations'),
  ('patroncounts.view','View patron counts','Operations'),
  ('patroncounts.log','Record patron counts','Operations'),
  ('maintenance.view','View maintenance','Operations'),
  ('maintenance.report','Report issues','Operations'),
  ('maintenance.manage','Manage issues','Operations'),
  ('lessons.view','View lessons','Programs'),
  ('lessons.attendance','Take attendance','Programs'),
  ('lessons.manage','Manage lessons','Programs'),
  ('members.view','View members','Programs'),
  ('members.manage','Manage members','Programs'),
  ('documents.view','View documents','Documents'),
  ('documents.manage','Manage documents','Documents'),
  ('community.view','View community network','Facilities')
on conflict (key) do nothing;

-- -----------------------------------------------------------------------------
-- Certification catalog
-- -----------------------------------------------------------------------------
insert into public.certifications (type, name, issuing_body, valid_months) values
  ('lifeguard','Lifeguard Certification','American Lifesaving Assoc.',24),
  ('cpr_aed','CPR / AED for Professional Rescuers','Red Cross',24),
  ('first_aid','Standard First Aid','Red Cross',24),
  ('wsi','Water Safety Instructor','American Lifesaving Assoc.',36),
  ('cpo_afo','Certified Pool Operator','Pool & Hot Tub Alliance',60),
  ('bloodborne_pathogens','Bloodborne Pathogens','OSHA-aligned',12)
on conflict (type) do nothing;

-- -----------------------------------------------------------------------------
-- Subscription plans + setup packages (placeholder pricing)
-- -----------------------------------------------------------------------------
insert into public.subscription_plans (tier, name, monthly_price, annual_price, limits, features) values
  ('small','Small Pool',49,529,
   '{"facilities":"1","pools":"2","staff":"25"}'::jsonb,
   array['Core scheduling','Time clock','Team messaging','Chemical logs','Checklists','Maintenance','Basic reports']),
  ('medium','Medium Pool',149,1609,
   '{"facilities":"3","pools":"6","staff":"100"}'::jsonb,
   array['Advanced scheduling','Certifications','Lessons','Members','Payroll export','Document library','More reports']),
  ('big','Big Pool / Enterprise',null,null,
   '{"facilities":"unlimited","pools":"unlimited","staff":"100+"}'::jsonb,
   array['Multi-site controls','Advanced permissions','Audit logs','Inspection exports','Custom onboarding','Custom reporting'])
on conflict (tier) do nothing;

insert into public.setup_packages (tier, name, price, summary) values
  ('starter','Starter Setup',0,'Self-guided setup for a single facility.'),
  ('guided','Guided Setup',299,'Assisted onboarding for multi-facility operations.'),
  ('premium','Premium Migration',null,'White-glove migration for multi-site and municipal operations.')
on conflict (tier) do nothing;

-- -----------------------------------------------------------------------------
-- Demo organization: facilities, channels, staff (per role), scheduling scenario,
-- time off, certifications, time clock, ops data, and quote examples.
--
-- Staff are seeded as staff_profiles WITHOUT a linked auth user (profile_id is
-- null) — they are roster entries. When a real person signs up via Supabase Auth,
-- link them by setting staff_profiles.profile_id = their profiles.id.
-- -----------------------------------------------------------------------------
do $$
declare
  v_org uuid;
  fac_mw uuid; fac_rb uuid; fac_ns uuid; fac_lk uuid;
  ch_all uuid; ch_guards uuid; ch_mgrs uuid;
  -- staff (one per role + extra lifeguards for scheduling)
  st_owner uuid; st_admin uuid; st_ops uuid; st_gmgr uuid; st_sched uuid; st_pay uuid;
  st_hr uuid; st_head uuid; st_lg1 uuid; st_lg2 uuid; st_lg_exp uuid; st_inst uuid;
  st_maint uuid; st_aud uuid;
  pp uuid;
  avail jsonb := '[
    {"day":"mon","start":"08:00","end":"18:00","preference":"available"},
    {"day":"tue","start":"08:00","end":"18:00","preference":"preferred"},
    {"day":"wed","start":"12:00","end":"20:00","preference":"available"},
    {"day":"thu","start":"08:00","end":"14:00","preference":"available"},
    {"day":"fri","start":"08:00","end":"18:00","preference":"preferred"},
    {"day":"sat","start":"09:00","end":"17:00","preference":"available"},
    {"day":"sun","start":"00:00","end":"00:00","preference":"unavailable"}
  ]'::jsonb;
  next_mon date := date_trunc('week', now())::date + 7;  -- Monday of next week
begin
  -- Idempotent: if the demo org already exists, don't seed a second copy.
  if exists (select 1 from public.organizations where name = 'Tide & Town Aquatics') then
    raise notice 'Demo org already seeded — skipping.';
    return;
  end if;

  insert into public.organizations (name, type, timezone, plan, billing_status, season_start, season_end)
  values ('Tide & Town Aquatics','community_pool','America/Chicago','medium','active', now()::date - 40, now()::date + 75)
  returning id into v_org;

  insert into public.facilities (organization_id, name, address, pool_type, operating_hours, capacity, status, inspection_required) values
    (v_org,'Maplewood Community Pool','412 Maplewood Dr, Cedar Falls','outdoor_competition','6:00 AM – 8:00 PM',240,'open',true)   returning id into fac_mw;
  insert into public.facilities (organization_id, name, address, pool_type, operating_hours, capacity, status, inspection_required) values
    (v_org,'Riverbend Aquatic Center','88 Riverbend Pkwy, Cedar Falls','indoor','5:30 AM – 9:00 PM',320,'open',true)              returning id into fac_rb;
  insert into public.facilities (organization_id, name, address, pool_type, operating_hours, capacity, status, inspection_required) values
    (v_org,'Northside Swim Club','1500 Northgate Ave, Cedar Falls','lap','6:00 AM – 7:00 PM',150,'weather_delay',true)           returning id into fac_ns;
  insert into public.facilities (organization_id, name, address, pool_type, operating_hours, capacity, status, inspection_required) values
    (v_org,'Lakeside Wading Pool','7 Lakeside Loop, Cedar Falls','wading','9:00 AM – 6:00 PM',60,'maintenance',false)            returning id into fac_lk;

  insert into public.pools (organization_id, facility_id, name, pool_type, volume_gallons, max_depth_ft) values
    (v_org, fac_mw,'Main Competition Pool','outdoor_competition',410000,12),
    (v_org, fac_mw,'Kiddie Splash Area','splash_pad',18000,1.5),
    (v_org, fac_rb,'Indoor 8-Lane','indoor',360000,13),
    (v_org, fac_ns,'6-Lane Lap Pool','lap',240000,9),
    (v_org, fac_lk,'Wading Pool','wading',22000,2);

  insert into public.channels (organization_id, name, kind, description) values
    (v_org,'All Team','all_staff','Everyone — org-wide announcements & coordination') returning id into ch_all;
  insert into public.channels (organization_id, name, kind, description, restricted_to_roles) values
    (v_org,'Lifeguards','role','Lifeguard team channel', array['lifeguard','head_lifeguard','lifeguard_manager','ops_manager','org_admin','super_admin']) returning id into ch_guards;
  insert into public.channels (organization_id, name, kind, description, restricted_to_roles) values
    (v_org,'Managers','role','Management coordination', array['ops_manager','lifeguard_manager','scheduling_manager','org_admin','super_admin','hr_coordinator']) returning id into ch_mgrs;
  insert into public.channels (organization_id, name, kind, description, restricted_to_roles) values
    (v_org,'Payroll / Admin','admin','Office & payroll', array['payroll_team','hr_coordinator','org_admin','super_admin']);
  insert into public.channels (organization_id, name, kind, description, facility_id) values
    (v_org,'Maplewood Pool','facility','Maplewood team', fac_mw);

  insert into public.organization_subscriptions (organization_id, plan_tier, billing_status, billing_cycle)
  values (v_org,'medium','active','monthly');

  -- Staff (one per role + lifeguards for a real scheduling scenario)
  insert into public.staff_profiles (organization_id, first_name, last_name, primary_role, roles, home_facility_id, facility_ids, title, age, is_minor, employment_status, availability, preferred_hours_per_week, pay_rate, onboarding_complete) values
   (v_org,'Dana','Whitfield','super_admin',array['super_admin'],fac_mw,array[fac_mw,fac_rb,fac_ns,fac_lk],'Founder & CEO',44,false,'active',avail,40,0,100) returning id into st_owner;
  insert into public.staff_profiles (organization_id, first_name, last_name, primary_role, roles, home_facility_id, facility_ids, title, age, employment_status, availability, preferred_hours_per_week, pay_rate, onboarding_complete) values
   (v_org,'Marcus','Reyes','org_admin',array['org_admin'],fac_mw,array[fac_mw,fac_rb,fac_ns,fac_lk],'Pool Director',38,'active',avail,40,45,100) returning id into st_admin;
  insert into public.staff_profiles (organization_id, first_name, last_name, primary_role, roles, home_facility_id, facility_ids, title, age, availability, preferred_hours_per_week, pay_rate, onboarding_complete) values
   (v_org,'Priya','Nair','ops_manager',array['ops_manager'],fac_rb,array[fac_rb,fac_ns],'Operations Manager',33,avail,40,32,100) returning id into st_ops;
  insert into public.staff_profiles (organization_id, first_name, last_name, primary_role, roles, home_facility_id, facility_ids, title, age, availability, preferred_hours_per_week, pay_rate, onboarding_complete) values
   (v_org,'Tom','Halvorsen','lifeguard_manager',array['lifeguard_manager'],fac_mw,array[fac_mw,fac_lk],'Aquatics Manager',29,avail,40,30,100) returning id into st_gmgr;
  insert into public.staff_profiles (organization_id, first_name, last_name, primary_role, roles, home_facility_id, facility_ids, title, age, availability, preferred_hours_per_week, pay_rate, onboarding_complete) values
   (v_org,'Sofia','Marin','scheduling_manager',array['scheduling_manager'],fac_rb,array[fac_mw,fac_rb,fac_ns,fac_lk],'Scheduling Manager',31,avail,40,28,100) returning id into st_sched;
  insert into public.staff_profiles (organization_id, first_name, last_name, primary_role, roles, home_facility_id, facility_ids, title, age, availability, preferred_hours_per_week, pay_rate, onboarding_complete) values
   (v_org,'Grace','Liu','payroll_team',array['payroll_team'],fac_mw,array[fac_mw],'Payroll Specialist',36,avail,40,30,100) returning id into st_pay;
  insert into public.staff_profiles (organization_id, first_name, last_name, primary_role, roles, home_facility_id, facility_ids, title, age, availability, preferred_hours_per_week, pay_rate, onboarding_complete) values
   (v_org,'Andre','Brooks','hr_coordinator',array['hr_coordinator'],fac_mw,array[fac_mw],'HR & Onboarding',34,avail,40,29,100) returning id into st_hr;
  insert into public.staff_profiles (organization_id, first_name, last_name, primary_role, roles, home_facility_id, facility_ids, title, age, availability, preferred_hours_per_week, pay_rate, onboarding_complete) values
   (v_org,'Jordan','Kim','head_lifeguard',array['head_lifeguard'],fac_mw,array[fac_mw,fac_lk],'Head Lifeguard',23,avail,32,21,100) returning id into st_head;
  insert into public.staff_profiles (organization_id, first_name, last_name, primary_role, roles, home_facility_id, facility_ids, title, age, availability, preferred_hours_per_week, pay_rate, onboarding_complete) values
   (v_org,'Maya','Patel','lifeguard',array['lifeguard'],fac_rb,array[fac_rb],'Lifeguard',19,avail,28,17,100) returning id into st_lg1;
  insert into public.staff_profiles (organization_id, first_name, last_name, primary_role, roles, home_facility_id, facility_ids, title, age, is_minor, employment_status, status_flags, availability, preferred_hours_per_week, pay_rate, onboarding_complete) values
   (v_org,'Ethan','Cole','lifeguard',array['lifeguard'],fac_mw,array[fac_mw],'Lifeguard',17,true,'pending_onboarding',array['pending_onboarding','missing_forms'],avail,18,16,45) returning id into st_lg2;
  insert into public.staff_profiles (organization_id, first_name, last_name, primary_role, roles, home_facility_id, facility_ids, title, age, status_flags, availability, preferred_hours_per_week, pay_rate, onboarding_complete) values
   (v_org,'Noah','Berg','lifeguard',array['lifeguard'],fac_lk,array[fac_lk],'Lifeguard',18,array['certification_expiring'],avail,24,17,100) returning id into st_lg_exp;
  insert into public.staff_profiles (organization_id, first_name, last_name, primary_role, roles, home_facility_id, facility_ids, title, age, availability, preferred_hours_per_week, pay_rate, onboarding_complete) values
   (v_org,'Ruby','Sanchez','swim_instructor',array['swim_instructor'],fac_rb,array[fac_rb],'Swim Instructor',27,avail,20,22,100) returning id into st_inst;
  insert into public.staff_profiles (organization_id, first_name, last_name, primary_role, roles, home_facility_id, facility_ids, title, age, availability, preferred_hours_per_week, pay_rate, onboarding_complete) values
   (v_org,'Hank','Dawson','maintenance',array['maintenance'],fac_mw,array[fac_mw,fac_rb,fac_ns,fac_lk],'Facilities & Maintenance',41,avail,40,23,100) returning id into st_maint;
  insert into public.staff_profiles (organization_id, first_name, last_name, primary_role, roles, home_facility_id, facility_ids, title, age, employment_status, availability, preferred_hours_per_week, pay_rate, onboarding_complete) values
   (v_org,'Eleanor','Vance','auditor',array['auditor'],fac_mw,array[fac_mw,fac_rb,fac_ns,fac_lk],'County Health Inspector',52,'seasonal',avail,8,0,100) returning id into st_aud;

  -- Certifications: valid for guards/instructor, EXPIRED lifeguard cert for Noah.
  insert into public.staff_certifications (organization_id, staff_id, type, status, issued_date, expires_date) values
    (v_org, st_head,'lifeguard','valid', now()::date-300, now()::date+400),
    (v_org, st_head,'cpr_aed','valid', now()::date-300, now()::date+400),
    (v_org, st_lg1,'lifeguard','valid', now()::date-200, now()::date+500),
    (v_org, st_lg1,'cpr_aed','valid', now()::date-200, now()::date+500),
    (v_org, st_lg_exp,'lifeguard','expired', now()::date-800, now()::date-20),   -- EXPIRED example
    (v_org, st_lg_exp,'cpr_aed','expired', now()::date-800, now()::date-8),
    (v_org, st_inst,'wsi','valid', now()::date-300, now()::date+600);

  -- Approved time off next week (the Auto Builder will visibly avoid these).
  insert into public.time_off_requests (organization_id, staff_id, start_date, end_date, reason, type, status) values
    (v_org, st_lg1, next_mon+1, next_mon+2, 'Family vacation','vacation','approved'),
    (v_org, st_head, next_mon+4, next_mon+4, 'College orientation','school','approved'),
    (v_org, st_inst, next_mon, next_mon, 'Personal day','personal','approved'),
    (v_org, st_lg2, next_mon+3, next_mon+3, 'Doctor appointment','personal','pending');

  -- Shifts this week (some assigned, some OPEN for pickup).
  insert into public.shifts (organization_id, facility_id, position, shift_date, start_time, end_time, assigned_staff_id, status) values
    (v_org, fac_mw,'lifeguard', now()::date, '08:00','13:00', st_head,'published'),
    (v_org, fac_mw,'lifeguard', now()::date, '13:00','18:00', st_lg2,'published'),
    (v_org, fac_rb,'lifeguard', now()::date, '06:00','12:00', st_lg1,'published'),
    (v_org, fac_rb,'lifeguard', now()::date, '12:00','17:00', null,'open'),
    (v_org, fac_ns,'lifeguard', now()::date, '08:00','13:00', null,'open'),
    (v_org, fac_lk,'lifeguard', now()::date+1, '10:00','15:00', null,'open');

  -- Time clock: a couple currently clocked in + a flagged missed punch.
  insert into public.time_clock_entries (organization_id, facility_id, staff_id, clock_in, status, flagged, note) values
    (v_org, fac_mw, st_head, now() - interval '2 hours','clocked_in', false, null),
    (v_org, fac_rb, st_lg1, now() - interval '3 hours','clocked_in', false, null),
    (v_org, fac_mw, st_lg2, null,'missed_in', true, 'Scheduled 08:00 — no clock-in recorded');

  -- All Team messages (sender null = system/seed; real users post as themselves).
  insert into public.messages (organization_id, channel_id, sender_id, body, pinned, kind) values
    (v_org, ch_all, null, 'Welcome to the 2026 season, team! Safety is our #1 priority every shift.', true, 'message'),
    (v_org, ch_all, null, '📅 Next week''s schedule will be published soon — watch this channel.', false, 'message'),
    (v_org, ch_guards, null, 'In-service training this Saturday 8am at Maplewood. Bring your rescue tube.', false, 'message');

  -- Chemical logs.
  insert into public.chemical_logs (organization_id, facility_id, free_chlorine, combined_chlorine, ph, alkalinity, calcium_hardness, cyanuric_acid, water_temp, notes, out_of_range) values
    (v_org, fac_mw, 2.4, 0.2, 7.5, 100, 280, 40, 82, 'Opening test — all in range.', array[]::text[]),
    (v_org, fac_rb, 5.2, 0.2, 7.5, 108, 315, 39, 81, 'FC spiked after shock — pool closed until below 4.0.', array['freeChlorine']);

  -- Maintenance issues.
  insert into public.maintenance_issues (organization_id, facility_id, area, title, description, priority, status, assigned_to, photo_path) values
    (v_org, fac_lk,'Pump Room','Circulation pump grinding noise','Possible bearing/seal failure.','urgent','waiting_parts', st_maint,'maintenance-photos/lakeside-pump.jpg'),
    (v_org, fac_ns,'Deck','Loose deck tile near lane 1','Trip hazard — tile lifting at corner.','high','new', null, null);

  -- Checklist template + items + a completion.
  declare cl uuid;
  begin
    insert into public.checklist_templates (organization_id, name, kind, cadence, facility_ids)
    values (v_org,'Daily Opening Checklist','opening','daily', array[fac_mw,fac_rb,fac_ns,fac_lk]) returning id into cl;
    insert into public.checklist_items (template_id, label, sort_order) values
      (cl,'Unlock gates and turn on lights',1),
      (cl,'Test chemical levels and log results',2),
      (cl,'Inspect pool deck for hazards',3),
      (cl,'Confirm rescue equipment in place',4),
      (cl,'Check AED and first-aid stations',5);
    insert into public.checklist_completions (organization_id, template_id, facility_id, status, note)
    values (v_org, cl, fac_mw,'complete','All clear at open.');
  end;

  -- Pay period + reviews for the payroll page.
  insert into public.pay_periods (organization_id, label, start_date, end_date, status)
  values (v_org, to_char(now()::date-12,'Mon DD')||' – '||to_char(now()::date+2,'Mon DD'), now()::date-12, now()::date+2,'needs_review')
  returning id into pp;
  insert into public.payroll_reviews (organization_id, pay_period_id, staff_id, regular_hours, overtime_hours, status, has_missing_punch, note) values
    (v_org, pp, st_head, 34, 2,'needs_review', false,'Overtime — confirm approval'),
    (v_org, pp, st_lg1, 28, 0,'ready', false, null),
    (v_org, pp, st_lg2, 16, 0,'needs_review', true,'Missing clock-out — verify hours');

  raise notice 'Seeded Tide & Town Aquatics (org=%) with 4 facilities, 14 staff, scheduling, ops & payroll demo data.', v_org;
end$$;

-- Example quote requests (public marketing form submissions).
insert into public.quote_requests (organization_name, contact_name, email, org_type, facility_count, pool_count, staff_count, recommended_plan, modules, message, status) values
  ('Cedar Falls Parks & Rec','Jordan Smith','jordan@cedarfalls.gov','municipality',5,9,140,'big', array['Scheduling','Inspections','Payroll export'],'Multi-site aquatics for the city — need procurement-friendly billing.','new'),
  ('Riverside Swim League','Avery Cole','avery@riversideswim.org','swim_club',2,4,42,'medium', array['Scheduling','Lessons','Certifications'],'Two pools, summer league + lessons.','new')
on conflict do nothing;

-- Done. The web & mobile apps also ship with full MOCK demo data
-- (packages/shared/src/data/seed.ts) so they work without this seed.

-- <<<<<<<<<<<<<<<<<<<< END seed.sql <<<<<<<<<<<<<<<<<<<<

-- >>>>>>>>>>>>>>>>>>>> BEGIN staff-auth-link.sql >>>>>>>>>>>>>>>>>>>>

-- Links staff_profiles to auth accounts (see AUDIT.md §4e). Additive + idempotent.
alter table public.staff_profiles add column if not exists email text;

drop index if exists idx_staff_org_profile;
create unique index idx_staff_org_profile
  on public.staff_profiles(organization_id, profile_id);

create index if not exists idx_staff_profile on public.staff_profiles(profile_id);
create index if not exists idx_staff_org_email
  on public.staff_profiles(organization_id, lower(email));

-- Org-scope current_staff_id() so a multi-tenant user resolves to the right row.
create or replace function public.current_staff_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.staff_profiles
  where profile_id = auth.uid() and organization_id = public.current_org_id()
  limit 1;
$$;

-- <<<<<<<<<<<<<<<<<<<< END staff-auth-link.sql <<<<<<<<<<<<<<<<<<<<
