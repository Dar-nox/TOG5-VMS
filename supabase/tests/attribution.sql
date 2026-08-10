-- Records remember who entered them.
--
-- The columns have been there since the initial schema and the RPC write paths
-- always filled them. What did not work was the four tables the browser writes
-- to directly — vehicles, fuel logs, vehicle photos, vehicle documents — where
-- `created_by` stayed null because nothing passed it and nothing defaulted it.
--
-- This runs as a signed-in user rather than the superuser on purpose. The
-- archiving bug went undetected for weeks because the suite ran as a superuser,
-- which bypasses RLS and has no `auth.uid()` — so a test written that way here
-- would prove nothing at all about the thing being tested.

insert into auth.users (id, email, raw_user_meta_data)
values ('d0000000-0000-0000-0000-00000000a771', 'author@tog5.test',
        '{"display_name": "Ana Reyes"}'::jsonb),
       ('d0000000-0000-0000-0000-00000000a772', 'editor@tog5.test',
        '{"display_name": "Ben Cruz"}'::jsonb);

set request.jwt.claim.sub = 'd0000000-0000-0000-0000-00000000a771';

do $$
declare
  van uuid;
  fuel uuid;
  author uuid := 'd0000000-0000-0000-0000-00000000a771';
  editor uuid := 'd0000000-0000-0000-0000-00000000a772';
  template uuid;
  setting_id uuid;
begin
  -- ----------------------------------------------------------------------
  -- A plain insert, exactly as the client makes it — no created_by named
  -- ----------------------------------------------------------------------
  insert into public.vehicles (vehicle_name, vehicle_type, fuel_type, current_odometer)
  values ('Attributed Van', 'van', 'diesel', 1000) returning id into van;

  assert (select created_by from public.vehicles where id = van) = author,
    'a vehicle should record who added it without the client having to say so';

  insert into public.fuel_logs
    (vehicle_id, fuel_date, odometer, fuel_type, liters, total_amount, is_full_tank)
  values (van, '2026-05-01'::timestamptz, 1100, 'diesel', 40, 2000, true)
  returning id into fuel;

  assert (select created_by from public.fuel_logs where id = fuel) = author,
    'a fuel log should record who entered it';

  -- ----------------------------------------------------------------------
  -- Reminders and templates, which had no columns at all before
  -- ----------------------------------------------------------------------
  select id into template from public.maintenance_templates
  where template_key = 'engine_oil_change';

  setting_id := public.upsert_vehicle_maintenance_setting(
    vehicle_id => van, template_id => template,
    custom_time_interval_days => 90, custom_odometer_interval_km => 5000
  );

  assert (select created_by from public.vehicle_maintenance_settings where id = setting_id)
         = author,
    'a reminder is something a person sets up, and should say who';

  -- ----------------------------------------------------------------------
  -- Editing records who edited, and leaves who created it alone
  -- ----------------------------------------------------------------------
  set local request.jwt.claim.sub = 'd0000000-0000-0000-0000-00000000a772';

  update public.fuel_logs set station_name = 'Petron' where id = fuel;

  assert (select updated_by from public.fuel_logs where id = fuel) = editor,
    'an edit should record who made it';
  assert (select created_by from public.fuel_logs where id = fuel) = author,
    'an edit must not overwrite who entered the record in the first place';
end $$;

-- ---------------------------------------------------------------------------
-- Work that nobody is doing does not erase who did
--
-- Plenty updates these rows without a person behind it: the odometer triggers,
-- the alert refresh, the nightly digest through pg_cron. `auth.uid()` is null
-- in all of them, and writing that null would blank the name of whoever last
-- touched the record by hand — leaving a field that looks answered and is not.
-- ---------------------------------------------------------------------------
reset request.jwt.claim.sub;

do $$
declare
  van uuid;
  fuel uuid;
  editor uuid := 'd0000000-0000-0000-0000-00000000a772';
begin
  select v.id into van from public.vehicles v where v.vehicle_name = 'Attributed Van';
  select f.id into fuel from public.fuel_logs f where f.vehicle_id = van limit 1;

  assert (select updated_by from public.fuel_logs where id = fuel) = editor,
    'setting up: the log should still name its editor';

  -- No claim set, so `auth.uid()` is null — the same position pg_cron is in.
  update public.fuel_logs set notes = 'touched by a background job' where id = fuel;

  assert (select updated_by from public.fuel_logs where id = fuel) = editor,
    'a background update must leave the last person who edited it in place';
end $$;

-- ---------------------------------------------------------------------------
-- An imported record has no author, and that is a real answer
-- ---------------------------------------------------------------------------
do $$
declare
  van uuid;
begin
  -- What `migrate_from_backup.py` emits: an explicit null, which beats the
  -- column default. The desktop app had one shared login and no per-record
  -- author, so nobody in this system entered these.
  insert into public.vehicles
    (vehicle_name, vehicle_type, fuel_type, current_odometer, created_by, updated_by)
  values ('Imported Van', 'van', 'diesel', 90000, null, null) returning id into van;

  assert (select created_by from public.vehicles where id = van) is null,
    'an explicit null must survive the default, or every imported record would '
    || 'claim to have been typed by whoever ran the import';
end $$;

select 'records remember who entered them' as result;
