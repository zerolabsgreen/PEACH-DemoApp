-- Break recursive dependency between organizations <-> organization_members policies

-- Helper function evaluated as table owner to avoid RLS recursion
create or replace function public.user_is_member_of_org(p_org_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.organization_members m
    where m.org_id = p_org_id and m.user_id = auth.uid()
  );
$$;

-- Replace organizations select policy to use the helper function
drop policy if exists orgs_select_members on public.organizations;
create policy orgs_select_members on public.organizations
  for select to authenticated
  using (public.user_is_member_of_org(id));


