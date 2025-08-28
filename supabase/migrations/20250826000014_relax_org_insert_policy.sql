-- Relax organizations INSERT policy completely for authenticated users.
-- Owner is still enforced by BEFORE INSERT trigger set_org_owner_id.

alter table if exists public.organizations enable row level security;

drop policy if exists orgs_insert_owner on public.organizations;
create policy orgs_insert_owner on public.organizations
  for insert to authenticated
  with check (true);


