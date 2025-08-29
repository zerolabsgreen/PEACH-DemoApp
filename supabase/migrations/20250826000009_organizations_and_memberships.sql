-- Organizations, memberships, and invitations
-- Idempotency helpers
create extension if not exists "pgcrypto";

-- Extend existing organizations table with ownership
alter table public.organizations
  add column if not exists owner_id uuid references auth.users(id) on delete cascade;

create table if not exists public.organization_members (
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('admin','member')),
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

create table if not exists public.organization_invitations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  invited_by uuid not null references auth.users(id) on delete set null,
  status text not null default 'pending' check (status in ('pending','accepted','rejected','cancelled')),
  token uuid not null unique default gen_random_uuid(),
  created_at timestamptz not null default now(),
  responded_at timestamptz
);

-- Helper function: check if user is admin of org
create or replace function public.is_org_admin(p_user_id uuid, p_org_id uuid)
returns boolean language sql stable as $$
  select exists (
    select 1 from public.organization_members m
    where m.org_id = p_org_id and m.user_id = p_user_id and m.role = 'admin'
  );
$$;

-- Trigger: when org created, add owner as admin member
create or replace function public.add_owner_as_admin()
returns trigger language plpgsql as $$
begin
  insert into public.organization_members(org_id, user_id, role)
  values (new.id, new.owner_id, 'admin')
  on conflict (org_id, user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_add_owner_as_admin on public.organizations;
create trigger trg_add_owner_as_admin
after insert on public.organizations
for each row execute function public.add_owner_as_admin();

-- RLS
-- Enable RLS on organizations (was not enabled in base migration)
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.organization_invitations enable row level security;

-- Policies: organizations
-- Remove permissive base policies and replace
drop policy if exists "Anyone can view organizations" on public.organizations;
drop policy if exists "Authenticated users can manage organizations" on public.organizations;
drop policy if exists orgs_select_members on public.organizations;
create policy orgs_select_members on public.organizations
  for select
  using (
    exists (
      select 1 from public.organization_members m
      where m.org_id = id and m.user_id = auth.uid()
    )
  );

drop policy if exists orgs_insert_owner on public.organizations;
create policy orgs_insert_owner on public.organizations
  for insert to authenticated
  with check (owner_id = auth.uid());

drop policy if exists orgs_update_admin on public.organizations;
create policy orgs_update_admin on public.organizations
  for update to authenticated
  using (public.is_org_admin(auth.uid(), id));

drop policy if exists orgs_delete_admin on public.organizations;
create policy orgs_delete_admin on public.organizations
  for delete to authenticated
  using (public.is_org_admin(auth.uid(), id));

-- Policies: organization_members
drop policy if exists org_members_select_member on public.organization_members;
create policy org_members_select_member on public.organization_members
  for select to authenticated
  using (
    org_id in (
      select org_id from public.organization_members where user_id = auth.uid()
    )
  );

drop policy if exists org_members_insert_admin on public.organization_members;
create policy org_members_insert_admin on public.organization_members
  for insert to authenticated
  with check (public.is_org_admin(auth.uid(), org_id));

drop policy if exists org_members_update_admin on public.organization_members;
create policy org_members_update_admin on public.organization_members
  for update to authenticated
  using (public.is_org_admin(auth.uid(), org_id));

drop policy if exists org_members_delete_admin on public.organization_members;
create policy org_members_delete_admin on public.organization_members
  for delete to authenticated
  using (public.is_org_admin(auth.uid(), org_id) or user_id = auth.uid());

-- Policies: organization_invitations
drop policy if exists invites_select_related on public.organization_invitations;
create policy invites_select_related on public.organization_invitations
  for select to authenticated
  using (
    -- Invited user can see their invites by email; members can see org invites
    (
      lower(email) = lower((select u.email from auth.users u where u.id = auth.uid()))
    ) or
    exists (
      select 1 from public.organization_members m
      where m.org_id = organization_invitations.org_id and m.user_id = auth.uid()
    )
  );

drop policy if exists invites_insert_admin on public.organization_invitations;
create policy invites_insert_admin on public.organization_invitations
  for insert to authenticated
  with check (
    public.is_org_admin(auth.uid(), org_id)
    and status = 'pending'
  );

drop policy if exists invites_update_invited_user_or_admin on public.organization_invitations;
create policy invites_update_invited_user_or_admin on public.organization_invitations
  for update to authenticated
  using (
    -- invited user may update their own invite; admins may update any for their org (e.g., cancel)
    (
      lower(email) = lower((select u.email from auth.users u where u.id = auth.uid()))
    ) or public.is_org_admin(auth.uid(), org_id)
  );

-- RPCs for accepting/rejecting invites
create or replace function public.accept_invitation(p_token uuid)
returns void language plpgsql as $$
declare
  v_inv public.organization_invitations%rowtype;
  v_user_id uuid;
  v_email text;
begin
  select * into v_inv from public.organization_invitations where token = p_token;
  if not found then
    raise exception 'Invitation not found';
  end if;
  if v_inv.status <> 'pending' then
    raise exception 'Invitation is not pending';
  end if;
  select email into v_email from auth.users where id = auth.uid();
  if lower(v_inv.email) <> lower(coalesce(v_email, '')) then
    raise exception 'Invitation email does not match current user';
  end if;

  v_user_id := auth.uid();
  -- add membership as member
  insert into public.organization_members(org_id, user_id, role)
  values (v_inv.org_id, v_user_id, 'member')
  on conflict (org_id, user_id) do nothing;

  update public.organization_invitations
  set status = 'accepted', responded_at = now()
  where id = v_inv.id;
end;
$$ security definer set search_path = public;

create or replace function public.reject_invitation(p_token uuid)
returns void language plpgsql as $$
declare
  v_inv public.organization_invitations%rowtype;
  v_email text;
begin
  select * into v_inv from public.organization_invitations where token = p_token;
  if not found then
    raise exception 'Invitation not found';
  end if;
  if v_inv.status <> 'pending' then
    raise exception 'Invitation is not pending';
  end if;
  select email into v_email from auth.users where id = auth.uid();
  if lower(v_inv.email) <> lower(coalesce(v_email, '')) then
    raise exception 'Invitation email does not match current user';
  end if;

  update public.organization_invitations
  set status = 'rejected', responded_at = now()
  where id = v_inv.id;
end;
$$ security definer set search_path = public;


