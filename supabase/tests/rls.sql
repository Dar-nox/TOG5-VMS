-- What the access rules are supposed to do.
--
-- Each block acts as a real signed-in user and fails loudly if the rules let
-- something through that they should not. Run with local_auth_stub.sql, the
-- migrations, and local_grants.sql applied first.

-- Two accounts. The trigger makes the first one the owner and the second a
-- manager, which is itself the first thing worth checking.
insert into auth.users (id, email, raw_user_meta_data)
values
  ('a0000000-0000-0000-0000-000000000001', 'owner@tog5.test',
   '{"display_name": "Ana Cruz"}'::jsonb),
  ('a0000000-0000-0000-0000-000000000002', 'maria@tog5.test',
   '{"display_name": "Maria Santos"}'::jsonb),
  -- A third authenticated identity with its profile removed again, so the
  -- "who may create an account" tests below can attempt a profile insert that
  -- only the access rules can refuse. Without this the insert would fail on
  -- the foreign key or on auth.users permissions, and the test would pass
  -- whether or not the rule it claims to check exists.
  ('a0000000-0000-0000-0000-000000000003', 'newhire@tog5.test',
   '{"display_name": "New Hire"}'::jsonb);

delete from public.profiles where id = 'a0000000-0000-0000-0000-000000000003';

do $$
begin
  assert (select role from public.profiles
          where id = 'a0000000-0000-0000-0000-000000000001') = 'owner',
    'the first account to sign up should be the owner';
  assert (select role from public.profiles
          where id = 'a0000000-0000-0000-0000-000000000002') = 'manager',
    'later accounts should be managers, not owners';
  assert (select display_name from public.profiles
          where id = 'a0000000-0000-0000-0000-000000000002') = 'Maria Santos',
    'the display name should come from the sign-up metadata';
end $$;

-- A vehicle to test against, inserted as the table owner before RLS applies.
insert into public.vehicles (id, vehicle_name, vehicle_type, fuel_type, current_odometer)
values ('b0000000-0000-0000-0000-000000000001', 'Service Van 1', 'van', 'diesel', 1200);

-- --------------------------------------------------------------------------
-- Nobody signed in sees anything
-- --------------------------------------------------------------------------
begin;
  set local role anon;
  do $$
  begin
    assert (select count(*) from public.vehicles) = 0,
      'a caller who is not signed in must not see any vehicles';
    assert (select count(*) from public.profiles) = 0,
      'a caller who is not signed in must not see the staff list';
  end $$;
rollback;

-- --------------------------------------------------------------------------
-- A manager does the day-to-day work
-- --------------------------------------------------------------------------
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'a0000000-0000-0000-0000-000000000002';

  do $$
  begin
    assert (select count(*) from public.vehicles) = 1,
      'a signed-in manager should see the fleet';

    insert into public.fuel_logs
      (vehicle_id, fuel_date, odometer, fuel_type, liters, total_amount, is_full_tank)
    values ('b0000000-0000-0000-0000-000000000001', now(), 1300, 'diesel', 40, 2600, true);

    insert into public.trips (vehicle_id, departure_time, reason)
    values ('b0000000-0000-0000-0000-000000000001', now(), 'Delivery run');

    assert (select count(*) from public.fuel_logs) = 1,
      'a manager should be able to record fuel';
  end $$;
rollback;

-- --------------------------------------------------------------------------
-- A manager cannot do the things only an owner should
-- --------------------------------------------------------------------------
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'a0000000-0000-0000-0000-000000000002';

  do $$
  declare
    was_refused boolean;
  begin
    begin
      insert into public.profiles (id, display_name, role)
      values ('a0000000-0000-0000-0000-000000000003', 'New Hire', 'manager');
      was_refused := false;
    exception when insufficient_privilege then
      was_refused := true;
    end;
    assert was_refused, 'a manager must not be able to create an account';

    begin
      insert into public.settings (key, value) values ('preferred_currency', 'USD');
      was_refused := false;
    exception when insufficient_privilege then
      was_refused := true;
    end;
    assert was_refused, 'a manager must not be able to change app settings';
  end $$;
rollback;

-- --------------------------------------------------------------------------
-- An owner can
-- --------------------------------------------------------------------------
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'a0000000-0000-0000-0000-000000000001';

  do $$
  begin
    insert into public.settings (key, value) values ('preferred_currency', 'PHP');
    assert (select value from public.settings where key = 'preferred_currency') = 'PHP',
      'an owner should be able to set app settings';

    insert into public.profiles (id, display_name, role)
    values ('a0000000-0000-0000-0000-000000000003', 'New Hire', 'manager');
    assert (select count(*) from public.profiles
            where id = 'a0000000-0000-0000-0000-000000000003') = 1,
      'an owner should be able to create an account';

    update public.profiles set role = 'viewer'
      where id = 'a0000000-0000-0000-0000-000000000002';
    assert (select role from public.profiles
            where id = 'a0000000-0000-0000-0000-000000000002') = 'viewer',
      'an owner should be able to change somebody''s role';
  end $$;
rollback;

-- --------------------------------------------------------------------------
-- Everyone can rename themselves, nobody can rename anybody else
-- --------------------------------------------------------------------------
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'a0000000-0000-0000-0000-000000000002';

  do $$
  begin
    update public.profiles set display_name = 'Maria S.'
      where id = 'a0000000-0000-0000-0000-000000000002';
    assert (select display_name from public.profiles
            where id = 'a0000000-0000-0000-0000-000000000002') = 'Maria S.',
      'anyone should be able to change their own display name';

    update public.profiles set display_name = 'Not Ana'
      where id = 'a0000000-0000-0000-0000-000000000001';
    assert (select display_name from public.profiles
            where id = 'a0000000-0000-0000-0000-000000000001') = 'Ana Cruz',
      'a manager must not be able to rename somebody else';
  end $$;
rollback;

-- --------------------------------------------------------------------------
-- Soft-deleted rows do not exist, even to a direct query
-- --------------------------------------------------------------------------
begin;
  update public.vehicles set deleted_at = now()
    where id = 'b0000000-0000-0000-0000-000000000001';

  set local role authenticated;
  set local request.jwt.claim.sub = 'a0000000-0000-0000-0000-000000000002';

  do $$
  begin
    assert (select count(*) from public.vehicles) = 0,
      'a soft-deleted vehicle must be invisible without any WHERE clause';
  end $$;
rollback;

-- --------------------------------------------------------------------------
-- A deactivated account keeps its history but loses its access
-- --------------------------------------------------------------------------
begin;
  update public.profiles set status = 'inactive'
    where id = 'a0000000-0000-0000-0000-000000000002';

  set local role authenticated;
  set local request.jwt.claim.sub = 'a0000000-0000-0000-0000-000000000002';

  do $$
  begin
    assert (select count(*) from public.vehicles) = 0,
      'a deactivated account must not be able to read the fleet';
  end $$;
rollback;

-- --------------------------------------------------------------------------
-- The activity history cannot be rewritten
-- --------------------------------------------------------------------------
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'a0000000-0000-0000-0000-000000000002';

  do $$
  declare
    was_refused boolean;
    entry_id uuid;
  begin
    insert into public.audit_logs (user_id, action, entity_type, entity_id, summary)
    values ('a0000000-0000-0000-0000-000000000002', 'create', 'vehicle',
            'b0000000-0000-0000-0000-000000000001', 'Added Service Van 1.')
    returning id into entry_id;

    begin
      update public.audit_logs set summary = 'Something else' where id = entry_id;
      was_refused := not found;
    exception when insufficient_privilege then
      was_refused := true;
    end;
    assert was_refused, 'the activity history must not be editable';

    begin
      delete from public.audit_logs where id = entry_id;
      was_refused := not found;
    exception when insufficient_privilege then
      was_refused := true;
    end;
    assert was_refused, 'the activity history must not be deletable';
  end $$;
rollback;

-- --------------------------------------------------------------------------
-- Nobody can write history in somebody else's name
-- --------------------------------------------------------------------------
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'a0000000-0000-0000-0000-000000000002';

  do $$
  declare
    was_refused boolean;
  begin
    begin
      insert into public.audit_logs (user_id, action, entity_type, summary)
      values ('a0000000-0000-0000-0000-000000000001', 'delete', 'vehicle',
              'Pinning this on the owner.');
      was_refused := false;
    exception when insufficient_privilege then
      was_refused := true;
    end;
    assert was_refused, 'an entry must be attributed to whoever actually wrote it';
  end $$;
rollback;

select 'all access rules behave as intended' as result;
