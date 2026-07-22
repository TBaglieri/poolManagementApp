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
