-- =============================================================================
-- PoolOps Pro — Team chat: group chats, DMs, membership + BACKEND permission
-- enforcement (RLS). Run AFTER schema.sql and rls-policies.sql.
--
-- This mirrors the shared permission model (packages/shared/src/chat/permissions.ts)
-- so the backend enforces the same rules the UI shows — a lifeguard cannot create a
-- group chat, disable/allow DMs, or read another tenant's chat via a raw API call.
--
--   • Group chats: manager tier and up may create (level >= 50 → super_admin,
--     org_admin, ops_manager, lifeguard_manager, scheduling_manager, payroll_team,
--     hr_coordinator). Front-line staff cannot.
--   • DMs: anyone may create, UNLESS the org has disabled DMs — then only managers.
--   • Membership: group/dm rows are visible and postable only to their members.
--   • Tenant isolation: every row is scoped to organization_id = current_org_id().
-- =============================================================================

-- 1) Columns -----------------------------------------------------------------
alter table public.channels add column if not exists chat_type text not null default 'announcement'; -- announcement|group|dm
alter table public.channels add column if not exists created_by uuid references public.profiles(id) on delete set null;
-- Org-wide "disable direct messages" switch (Super Admin / Pool Manager only).
alter table public.organizations add column if not exists dms_disabled boolean not null default false;

create index if not exists idx_channel_members_profile on public.channel_members(profile_id);

-- 2) Helper predicates -------------------------------------------------------
-- Is the current user a member of this channel?
create or replace function public.is_channel_member(cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.channel_members m
    where m.channel_id = cid and m.profile_id = auth.uid()
  );
$$;

-- May the current user create a GROUP chat? Manager tier and up (mirrors level >= 50).
create or replace function public.can_create_group_chat()
returns boolean language sql stable as $$
  select public.has_role('super_admin','org_admin','ops_manager','lifeguard_manager',
                         'scheduling_manager','payroll_team','hr_coordinator');
$$;

-- May the current user start/send a DM right now? Open unless the org disabled DMs,
-- in which case only manager-tier users may still DM.
create or replace function public.can_send_dm()
returns boolean language sql stable security definer set search_path = public as $$
  select case
    when not coalesce((select o.dms_disabled from public.organizations o where o.id = public.current_org_id()), false)
      then true
    else public.can_create_group_chat()
  end;
$$;

-- Manager tier OR the channel's creator (for member management).
create or replace function public.can_manage_channel(cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.can_create_group_chat()
      or exists (select 1 from public.channels c where c.id = cid and c.created_by = auth.uid());
$$;

-- 3) channels RLS ------------------------------------------------------------
alter table public.channels enable row level security;

-- READ: announcement channels are org-wide; group/dm only to their members.
drop policy if exists channels_select on public.channels;
create policy channels_select on public.channels for select
  using (
    organization_id = public.current_org_id()
    and (chat_type = 'announcement' or public.is_channel_member(id))
  );

-- INSERT: tenant-scoped; group needs manager role, dm needs DMs allowed,
-- announcement needs an announce-capable role. created_by must be the caller.
drop policy if exists channels_insert on public.channels;
create policy channels_insert on public.channels for insert
  with check (
    organization_id = public.current_org_id()
    and (created_by is null or created_by = auth.uid())
    and (
      (chat_type = 'group' and public.can_create_group_chat())
      or (chat_type = 'dm' and public.can_send_dm())
      or (chat_type = 'announcement' and public.has_role(
            'super_admin','org_admin','ops_manager','lifeguard_manager','scheduling_manager','hr_coordinator'))
    )
  );

-- UPDATE/DELETE a chat: its creator or a manager (org-scoped).
drop policy if exists channels_manage on public.channels;
create policy channels_manage on public.channels for update
  using (organization_id = public.current_org_id() and public.can_manage_channel(id));
drop policy if exists channels_delete on public.channels;
create policy channels_delete on public.channels for delete
  using (organization_id = public.current_org_id() and public.can_manage_channel(id));

-- 4) channel_members RLS -----------------------------------------------------
alter table public.channel_members enable row level security;

-- READ: you can see the roster of a channel you're in (or that you manage).
drop policy if exists channel_members_select on public.channel_members;
create policy channel_members_select on public.channel_members for select
  using (public.is_channel_member(channel_id) or public.can_manage_channel(channel_id));

-- ADD members: the channel's creator or a manager. (A user is also implicitly
-- added at creation by the same actor, satisfying this check.)
drop policy if exists channel_members_add on public.channel_members;
create policy channel_members_add on public.channel_members for insert
  with check (public.can_manage_channel(channel_id));

-- REMOVE members: creator or manager; or a member removing THEMSELVES (leave).
drop policy if exists channel_members_remove on public.channel_members;
create policy channel_members_remove on public.channel_members for delete
  using (public.can_manage_channel(channel_id) or profile_id = auth.uid());

-- update last_read_at for your own membership row.
drop policy if exists channel_members_read_state on public.channel_members;
create policy channel_members_read_state on public.channel_members for update
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- 5) messages RLS (tighten membership for group/dm) --------------------------
-- READ: announcement channels are org-wide; group/dm only to their members.
drop policy if exists messages_read on public.messages;
create policy messages_read on public.messages for select
  using (
    organization_id = public.current_org_id()
    and exists (
      select 1 from public.channels c
      where c.id = messages.channel_id
        and (c.chat_type = 'announcement' or public.is_channel_member(c.id))
    )
  );

-- POST: you must be the sender, in-org, and a member of any group/dm channel.
drop policy if exists messages_post on public.messages;
create policy messages_post on public.messages for insert
  with check (
    organization_id = public.current_org_id()
    and sender_id = auth.uid()
    and exists (
      select 1 from public.channels c
      where c.id = messages.channel_id
        and (c.chat_type = 'announcement' or public.is_channel_member(c.id))
    )
  );

-- (messages_pin policy from rls-policies.sql is unchanged.)

-- 6) Realtime ----------------------------------------------------------------
-- messages/channels are already published (supabase/realtime.sql); add membership
-- so a client updates its chat list live when added/removed.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'channel_members'
  ) then
    execute 'alter publication supabase_realtime add table public.channel_members';
  end if;
end$$;
