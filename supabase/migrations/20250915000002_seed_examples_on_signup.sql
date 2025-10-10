-- Seed default example entities for each new user
-- Created: 2025-09-15

-- This migration adds a trigger that, on user signup, creates sample
-- organizations, production sources, EACertificates, and Events for the user.

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
  -- Create two sample organizations (insert separately to capture ids)
  insert into public.organizations(id, name, url, description, contacts, location, documents, owner_id)
  values (uuid_generate_v4(), 'Acme Energy Co', 'https://example.com', 'Sample organization for your workspace', null, null, null, v_user_id)
  returning id into v_org1_id;

  insert into public.organizations(id, name, url, description, contacts, location, documents, owner_id)
  values (uuid_generate_v4(), 'Green Fuels Ltd', null, 'Another sample organization', null, null, null, v_user_id)
  returning id into v_org2_id;

  -- Create two sample production sources (location object and technology are required)
  insert into public.production_sources(id, name, description, technology, location, links, documents, external_ids, related_production_sources, organizations, metadata, events, owner_id)
  values
    (
      uuid_generate_v4(),
      'Solar Farm Alpha',
      '10 MW solar PV installation',
      'Solar',
      jsonb_build_object('city','Austin','state','TX','country','USA'),
      null,
      null,
      null,
      null,
      jsonb_build_array(jsonb_build_object('orgId', v_org1_id, 'role', 'Owner')),
      null,
      null,
      v_user_id
    )
  returning id into v_ps1_id;

  insert into public.production_sources(id, name, description, technology, location, links, documents, external_ids, related_production_sources, organizations, metadata, events, owner_id)
  values
    (
      uuid_generate_v4(),
      'Wind Park Beta',
      'Offshore wind turbines',
      'Wind',
      jsonb_build_object('city','Esbjerg','country','Denmark'),
      null,
      null,
      null,
      null,
      jsonb_build_array(jsonb_build_object('orgId', v_org2_id, 'role', 'Operator')),
      null,
      null,
      v_user_id
    )
  returning id into v_ps2_id;

  -- Create two sample EACertificates (amounts must be a non-empty array with amount/unit)
  insert into public.eacertificates(id, type, external_ids, amounts, emissions, links, documents, owner_id)
  values
    (
      uuid_generate_v4(),
      'REC'::public.eac_type_enum,
      null,
      '[{"amount": 1, "unit": "MWh"}]'::jsonb,
      null,
      null,
      null,
      v_user_id
    )
  returning id into v_eac1_id;

  insert into public.eacertificates(id, type, external_ids, amounts, emissions, links, documents, owner_id)
  values
    (
      uuid_generate_v4(),
      'RNG'::public.eac_type_enum,
      null,
      '[{"amount": 10, "unit": "MMBtu"}]'::jsonb,
      null,
      null,
      null,
      v_user_id
    )
  returning id into v_eac2_id;

  -- Create example events linked to produced entities
  -- Use string dates as required by validate_event_json()
  insert into public.events(id, target, target_id, type, description, dates, location, organizations, notes, documents, links, owner_id)
  values
    (
      uuid_generate_v4(),
      'PSOURCE'::public.eac_event_target_enum,
      v_ps1_id,
      'Commissioned',
      'Production source commissioned',
      jsonb_build_object('start', to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')),
      null,
      jsonb_build_array(jsonb_build_object('orgId', v_org1_id, 'role', 'Owner')),
      null,
      null,
      null,
      v_user_id
    ),
    (
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

-- Attach a separate trigger so we do not risk altering existing profile creation logic
drop trigger if exists on_auth_user_seed_examples on auth.users;
create trigger on_auth_user_seed_examples
after insert on auth.users
for each row execute function public.seed_examples_for_new_user();


