-- Remove organization membership/invitations and owner_id

-- Drop policies first to avoid dependency errors
drop policy if exists org_members_select_member on public.organization_members;
drop policy if exists org_members_insert_admin on public.organization_members;
drop policy if exists org_members_update_admin on public.organization_members;
drop policy if exists org_members_delete_admin on public.organization_members;
drop policy if exists invites_select_related on public.organization_invitations;
drop policy if exists invites_insert_admin on public.organization_invitations;
drop policy if exists invites_update_invited_user_or_admin on public.organization_invitations;

-- Drop organizations select policy that references helper function, before dropping the function
drop policy if exists orgs_select_members on public.organizations;

-- Drop tables if they exist
drop table if exists public.organization_invitations cascade;
drop table if exists public.organization_members cascade;

-- Remove triggers (drop triggers before dropping functions they depend on)
drop trigger if exists trg_add_owner_as_admin on public.organizations;
drop trigger if exists trg_set_org_owner_id on public.organizations;

-- Remove helper/trigger functions if present
drop function if exists public.accept_invitation(uuid);
drop function if exists public.reject_invitation(uuid);
drop function if exists public.user_is_member_of_org(uuid);
drop function if exists public.add_owner_as_admin();
drop function if exists public.set_org_owner_id();

-- Drop owner_id from organizations
-- Drop any policies that still reference owner_id before dropping the column
drop policy if exists orgs_update_admin on public.organizations;
drop policy if exists orgs_delete_admin on public.organizations;
drop policy if exists orgs_insert_owner on public.organizations;
alter table public.organizations drop column if exists owner_id;

-- Reset organizations policies to simple authenticated CRUD
alter table public.organizations enable row level security;
drop policy if exists orgs_select_members on public.organizations;
drop policy if exists orgs_insert_owner on public.organizations;
drop policy if exists orgs_update_admin on public.organizations;
drop policy if exists orgs_delete_admin on public.organizations;
drop policy if exists "Anyone can view organizations" on public.organizations;
drop policy if exists "Authenticated users can manage organizations" on public.organizations;

create policy "Anyone can view organizations" on public.organizations
  for select using (true);

create policy "Authenticated users can manage organizations" on public.organizations
  for all to authenticated using (true) with check (true);


