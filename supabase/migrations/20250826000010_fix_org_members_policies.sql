-- Fix recursive policies on organization_members and invitations
-- Switch to owner-based checks via organizations.owner_id to avoid recursion

-- Safety: enable extensions that might be needed
create extension if not exists "pgcrypto";

-- Ensure RLS is on
alter table if exists public.organizations enable row level security;
alter table if exists public.organization_members enable row level security;
alter table if exists public.organization_invitations enable row level security;

-- First drop any policies that may depend on the helper function
drop policy if exists orgs_select_members on public.organizations;
drop policy if exists orgs_insert_owner on public.organizations;
drop policy if exists orgs_update_admin on public.organizations;
drop policy if exists orgs_delete_admin on public.organizations;
-- Also remove permissive base policies from initial setup, if still present
drop policy if exists "Anyone can view organizations" on public.organizations;
drop policy if exists "Authenticated users can manage organizations" on public.organizations;

create policy orgs_select_members on public.organizations
  for select to authenticated
  using (
    exists (
      select 1 from public.organization_members m
      where m.org_id = id and m.user_id = auth.uid()
    )
  );

create policy orgs_insert_owner on public.organizations
  for insert to authenticated
  with check (owner_id = auth.uid());

create policy orgs_update_admin on public.organizations
  for update to authenticated
  using (owner_id = auth.uid());

create policy orgs_delete_admin on public.organizations
  for delete to authenticated
  using (owner_id = auth.uid());

-- Now replace organization_members policies with non-recursive ones
drop policy if exists org_members_select_member on public.organization_members;
drop policy if exists org_members_insert_admin on public.organization_members;
drop policy if exists org_members_update_admin on public.organization_members;
drop policy if exists org_members_delete_admin on public.organization_members;

create policy org_members_select_member on public.organization_members
  for select to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.organizations o where o.id = org_id and o.owner_id = auth.uid()
    )
  );

create policy org_members_insert_admin on public.organization_members
  for insert to authenticated
  with check (
    exists (
      select 1 from public.organizations o where o.id = org_id and o.owner_id = auth.uid()
    )
  );

create policy org_members_update_admin on public.organization_members
  for update to authenticated
  using (
    exists (
      select 1 from public.organizations o where o.id = org_id and o.owner_id = auth.uid()
    )
  );

create policy org_members_delete_admin on public.organization_members
  for delete to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.organizations o where o.id = org_id and o.owner_id = auth.uid()
    )
  );

-- Replace invitations policies to avoid membership recursion
drop policy if exists invites_select_related on public.organization_invitations;
drop policy if exists invites_insert_admin on public.organization_invitations;
drop policy if exists invites_update_invited_user_or_admin on public.organization_invitations;

create policy invites_select_related on public.organization_invitations
  for select to authenticated
  using (
    (
      lower(email) = lower((select u.email from auth.users u where u.id = auth.uid()))
    ) or exists (
      select 1 from public.organizations o where o.id = organization_invitations.org_id and o.owner_id = auth.uid()
    )
  );

create policy invites_insert_admin on public.organization_invitations
  for insert to authenticated
  with check (
    exists (
      select 1 from public.organizations o where o.id = org_id and o.owner_id = auth.uid()
    ) and status = 'pending'
  );

create policy invites_update_invited_user_or_admin on public.organization_invitations
  for update to authenticated
  using (
    (
      lower(email) = lower((select u.email from auth.users u where u.id = auth.uid()))
    ) or exists (
      select 1 from public.organizations o where o.id = org_id and o.owner_id = auth.uid()
    )
  );

-- Finally, drop the recursive helper function if it exists (no policies depend on it now)
drop function if exists public.is_org_admin(uuid, uuid);


