-- Fix signup seeding to match current schema and RLS without altering previous migration
-- Created: 2025-09-15

create or replace function public.seed_examples_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := new.id;
  v_org1_id uuid;
  v_org2_id uuid;
  v_ps1_id uuid;
  v_ps2_id uuid;
  v_eac1_id uuid;
  v_eac2_id uuid;
begin
  -- Ensure RLS policies evaluate as this new user
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_user_id, 'role', 'authenticated')::text,
    true
  );

  -- Organizations (insert separately to capture ids). Note: column name is contacts
  insert into public.organizations(id, name, url, description, contacts, location, documents, owner_id)
  values (uuid_generate_v4(), 'Acme Energy Co', 'https://example.com', 'Sample organization for your workspace', null, null, null, v_user_id)
  returning id into v_org1_id;

  insert into public.organizations(id, name, url, description, contacts, location, documents, owner_id)
  values (uuid_generate_v4(), 'Green Fuels Ltd', null, 'Another sample organization', null, null, null, v_user_id)
  returning id into v_org2_id;

  -- Production sources: required fields location (jsonb object) and technology (text)
  insert into public.production_sources(
    id, name, description, technology, location, links, documents,
    external_ids, related_production_sources, organizations, metadata, events, owner_id
  ) values (
    uuid_generate_v4(),
    'Solar Farm Alpha',
    '10 MW solar PV installation',
    'Solar',
    jsonb_build_object('city','Austin','state','TX','country','USA'),
    null,
    null,
    null,
    null,
    ARRAY[ jsonb_build_object('orgId', v_org1_id, 'role', 'Owner') ]::jsonb[],
    null,
    null,
    v_user_id
  ) returning id into v_ps1_id;

  insert into public.production_sources(
    id, name, description, technology, location, links, documents,
    external_ids, related_production_sources, organizations, metadata, events, owner_id
  ) values (
    uuid_generate_v4(),
    'Wind Park Beta',
    'Offshore wind turbines',
    'Wind',
    jsonb_build_object('city','Esbjerg','country','Denmark'),
    null,
    null,
    null,
    null,
    ARRAY[ jsonb_build_object('orgId', v_org2_id, 'role', 'Operator') ]::jsonb[],
    null,
    null,
    v_user_id
  ) returning id into v_ps2_id;

  -- EACertificates: amounts is jsonb[] (must be non-empty, include amount and unit)
  insert into public.eacertificates(id, type, external_ids, amounts, emissions, links, documents, owner_id)
  values (
    uuid_generate_v4(),
    'REC'::public.eac_type_enum,
    null,
    ARRAY[ jsonb_build_object('amount', 1, 'unit', 'MWh') ]::jsonb[],
    null,
    null,
    null,
    v_user_id
  ) returning id into v_eac1_id;

  insert into public.eacertificates(id, type, external_ids, amounts, emissions, links, documents, owner_id)
  values (
    uuid_generate_v4(),
    'RNG'::public.eac_type_enum,
    null,
    ARRAY[ jsonb_build_object('amount', 10, 'unit', 'MMBtu') ]::jsonb[],
    null,
    null,
    null,
    v_user_id
  ) returning id into v_eac2_id;

  -- Events: organizations is jsonb[]; dates must contain a string start
  insert into public.events(id, target, target_id, type, description, dates, location, organizations, notes, documents, links, owner_id)
  values (
    uuid_generate_v4(),
    'PSOURCE'::public.eac_event_target_enum,
    v_ps1_id,
    'Commissioned',
    'Production source commissioned',
    jsonb_build_object('start', to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')),
    null,
    ARRAY[ jsonb_build_object('orgId', v_org1_id, 'role', 'Owner') ]::jsonb[],
    null,
    null,
    null,
    v_user_id
  );

  insert into public.events(id, target, target_id, type, description, dates, location, organizations, notes, documents, links, owner_id)
  values (
    uuid_generate_v4(),
    'EAC'::public.eac_event_target_enum,
    v_eac1_id,
    'Issued',
    'Certificate issued',
    jsonb_build_object('start', to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')),
    null,
    null,
    null,
    null,
    null,
    v_user_id
  );

  return new;
end;
$$;

-- No trigger change needed; existing trigger calls the function by name.


