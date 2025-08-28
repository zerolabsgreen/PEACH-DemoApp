-- Ensure inserts into organizations set owner_id to the current user

create or replace function public.set_org_owner_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.owner_id is null then
    new.owner_id := auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_org_owner_id on public.organizations;
create trigger trg_set_org_owner_id
before insert on public.organizations
for each row execute function public.set_org_owner_id();

-- Relax insert policy to allow owner_id null (trigger fills it)
drop policy if exists orgs_insert_owner on public.organizations;
create policy orgs_insert_owner on public.organizations
  for insert to authenticated
  with check (
    owner_id = auth.uid() or owner_id is null
  );


