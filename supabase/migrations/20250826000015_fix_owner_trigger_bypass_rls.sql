-- Ensure adding owner as admin bypasses RLS on organization_members

create or replace function public.add_owner_as_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.organization_members(org_id, user_id, role)
  values (new.id, new.owner_id, 'admin')
  on conflict (org_id, user_id) do nothing;
  return new;
end;
$$;

-- Reattach trigger to be safe
drop trigger if exists trg_add_owner_as_admin on public.organizations;
create trigger trg_add_owner_as_admin
after insert on public.organizations
for each row execute function public.add_owner_as_admin();


