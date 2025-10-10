-- Extend example seed on signup: more certificates (all types) and
-- two events per certificate. Safe to re-run by replacing function bodies.
-- Created: 2025-09-15

-- Helper used by seed to add two events for a certificate
create or replace function public.add_two_events(p_user uuid, p_cert uuid)
returns void
language plpgsql
as $$
declare 
  v_now text := to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'); 
begin
  if p_cert is null then return; end if;

  insert into public.events(id, target, target_id, type, description, dates, owner_id)
  values (uuid_generate_v4(),'EAC'::public.eac_event_target_enum,p_cert,'Issued','Certificate issued', jsonb_build_object('start', v_now), p_user);

  insert into public.events(id, target, target_id, type, description, dates, owner_id)
  values (uuid_generate_v4(),'EAC'::public.eac_event_target_enum,p_cert,'Retired','Certificate retired', jsonb_build_object('start', v_now), p_user);
end $$;

-- Main seed function called on auth.users insert
create or replace function public.seed_examples_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := new.id;

  v_org1 uuid;
  v_org2 uuid;
  v_ps1 uuid;

  v_eac_rec uuid;
  v_eac_rtc uuid;
  v_eac_rng uuid;
  v_eac_saf uuid;
  v_eac_cc  uuid;
  v_eac_cr  uuid;
begin
  begin
    -- Ensure RLS evaluates as the new user
    perform set_config(
      'request.jwt.claims',
      json_build_object('sub', v_user_id, 'role', 'authenticated')::text,
      true
    );

    -- Organizations
    insert into public.organizations(id, name, owner_id)
    values (uuid_generate_v4(), 'Acme Energy Co', v_user_id)
    returning id into v_org1;

    insert into public.organizations(id, name, owner_id)
    values (uuid_generate_v4(), 'Green Fuels Ltd', v_user_id)
    returning id into v_org2;

    -- Production source
    insert into public.production_sources(id, name, technology, location, organizations, owner_id)
    values (
      uuid_generate_v4(),
      'Solar Farm Alpha',
      'Solar',
      jsonb_build_object('city','Austin','state','TX','country','USA'),
      ARRAY[ jsonb_build_object('orgId', v_org1, 'role', 'Owner') ]::jsonb[],
      v_user_id
    )
    returning id into v_ps1;

    -- Certificates (all supported types)
    insert into public.eacertificates(id, type, amounts, owner_id)
    values (uuid_generate_v4(),'REC'::public.eac_type_enum, ARRAY[ jsonb_build_object('amount',1,'unit','MWh') ]::jsonb[], v_user_id)
    returning id into v_eac_rec;

    insert into public.eacertificates(id, type, amounts, owner_id)
    values (uuid_generate_v4(),'RTC'::public.eac_type_enum, ARRAY[ jsonb_build_object('amount',20,'unit','MMBtu') ]::jsonb[], v_user_id)
    returning id into v_eac_rtc;

    insert into public.eacertificates(id, type, amounts, owner_id)
    values (uuid_generate_v4(),'RNG'::public.eac_type_enum, ARRAY[ jsonb_build_object('amount',10,'unit','MMBtu') ]::jsonb[], v_user_id)
    returning id into v_eac_rng;

    insert into public.eacertificates(id, type, amounts, owner_id)
    values (uuid_generate_v4(),'SAF'::public.eac_type_enum, ARRAY[ jsonb_build_object('amount',5,'unit','tCO2e') ]::jsonb[], v_user_id)
    returning id into v_eac_saf;

    insert into public.eacertificates(id, type, amounts, owner_id)
    values (uuid_generate_v4(),'CC'::public.eac_type_enum,  ARRAY[ jsonb_build_object('amount',50,'unit','tCO2e') ]::jsonb[], v_user_id)
    returning id into v_eac_cc;

    insert into public.eacertificates(id, type, amounts, owner_id)
    values (uuid_generate_v4(),'CR'::public.eac_type_enum,  ARRAY[ jsonb_build_object('amount',25,'unit','tCO2e') ]::jsonb[], v_user_id)
    returning id into v_eac_cr;

    -- Two events per certificate
    perform public.add_two_events(v_user_id, v_eac_rec);
    perform public.add_two_events(v_user_id, v_eac_rtc);
    perform public.add_two_events(v_user_id, v_eac_rng);
    perform public.add_two_events(v_user_id, v_eac_saf);
    perform public.add_two_events(v_user_id, v_eac_cc);
    perform public.add_two_events(v_user_id, v_eac_cr);

  exception when others then
    -- Do not block signup on seed failure
    perform 1;
  end;

  return new;
end;
$$;

-- Ensure trigger exists (recreate to be safe)
drop trigger if exists on_auth_user_seed_examples on auth.users;
create trigger on_auth_user_seed_examples
after insert on auth.users
for each row execute function public.seed_examples_for_new_user();


