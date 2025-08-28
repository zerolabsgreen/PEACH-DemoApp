-- Replace email lookups that touched auth.users with JWT-claims-based helpers

-- Helper: get current user's email from JWT claims
create or replace function public.current_user_email()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::json->>'email',
    ''
  );
$$;

-- Update invitations policies to use current_user_email()
drop policy if exists invites_select_related on public.organization_invitations;
create policy invites_select_related on public.organization_invitations
  for select to authenticated
  using (
    lower(email) = lower(public.current_user_email())
    or exists (
      select 1 from public.organizations o where o.id = organization_invitations.org_id and o.owner_id = auth.uid()
    )
  );

drop policy if exists invites_update_invited_user_or_admin on public.organization_invitations;
create policy invites_update_invited_user_or_admin on public.organization_invitations
  for update to authenticated
  using (
    lower(email) = lower(public.current_user_email())
    or exists (
      select 1 from public.organizations o where o.id = org_id and o.owner_id = auth.uid()
    )
  );

-- Recreate RPCs to avoid selecting from auth.users
create or replace function public.accept_invitation(p_token uuid)
returns void language plpgsql security definer set search_path = public as $$
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

  v_email := public.current_user_email();
  if lower(v_inv.email) <> lower(coalesce(v_email, '')) then
    raise exception 'Invitation email does not match current user';
  end if;

  v_user_id := auth.uid();
  insert into public.organization_members(org_id, user_id, role)
  values (v_inv.org_id, v_user_id, 'member')
  on conflict (org_id, user_id) do nothing;

  update public.organization_invitations
  set status = 'accepted', responded_at = now()
  where id = v_inv.id;
end;
$$;

create or replace function public.reject_invitation(p_token uuid)
returns void language plpgsql security definer set search_path = public as $$
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

  v_email := public.current_user_email();
  if lower(v_inv.email) <> lower(coalesce(v_email, '')) then
    raise exception 'Invitation email does not match current user';
  end if;

  update public.organization_invitations
  set status = 'rejected', responded_at = now()
  where id = v_inv.id;
end;
$$;


