-- Getting a record back after somebody archived the wrong line.
--
-- The archive is invisible to the read policies, so almost everything here is
-- checking that the one deliberate hole in that wall is the right size: the
-- owner can see through it, nobody else can, and what comes back through it is
-- the record as it was rather than a fresh one wearing its name.

insert into auth.users (id, email, raw_user_meta_data)
values
  ('d0000000-0000-0000-0000-000000000001', 'owner@tog5.test',
   '{"display_name": "Ana Cruz"}'::jsonb),
  ('d0000000-0000-0000-0000-000000000002', 'maria@tog5.test',
   '{"display_name": "Maria Santos"}'::jsonb);

-- The second account arrives pending, and a pending account sees nothing at
-- all — which would make the "a manager may not restore" checks below pass for
-- the wrong reason.
update public.profiles set status = 'active'
where id = 'd0000000-0000-0000-0000-000000000002';

-- ---------------------------------------------------------------------------
-- A fuel log, and the odometer it moved
-- ---------------------------------------------------------------------------
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'd0000000-0000-0000-0000-000000000001';

  do $$
  declare
    v uuid;
    older uuid;
    newer uuid;
    archive jsonb;
    reading numeric;
  begin
    insert into public.vehicles (vehicle_name, vehicle_type, fuel_type, current_odometer)
    values ('Restore Van', 'van', 'diesel', 10000) returning id into v;

    insert into public.fuel_logs (vehicle_id, fuel_date, odometer, fuel_type,
                                  liters, total_amount, station_name)
    values (v, now() - interval '10 days', 12000, 'diesel', 40, 2400, 'Shell EDSA')
    returning id into older;

    insert into public.fuel_logs (vehicle_id, fuel_date, odometer, fuel_type,
                                  liters, total_amount)
    values (v, now() - interval '2 days', 13000, 'diesel', 38, 2280)
    returning id into newer;

    select current_odometer into reading from public.vehicles where id = v;
    assert reading = 13000, 'the fills should have moved the vehicle to 13000, got ' || reading;

    -- Nothing is archived yet, so the screen should be empty rather than absent.
    assert public.archived_records() = '[]'::jsonb,
      'an empty archive is an empty list, not null';

    perform public.archive_fuel_log(older);

    select current_odometer into reading from public.vehicles where id = v;
    assert reading = 13000, 'archiving must not wind the odometer back';

    archive := public.archived_records();
    assert jsonb_array_length(archive) = 1, 'the archived fill should be listed';
    assert archive -> 0 ->> 'kind' = 'fuel', 'listed under its own kind';
    assert archive -> 0 ->> 'vehicleName' = 'Restore Van', 'named by its vehicle';
    assert archive -> 0 ->> 'summary' = '40 L',
      'litres without trailing zeros, got: ' || (archive -> 0 ->> 'summary');
    assert archive -> 0 ->> 'detail' = 'Shell EDSA', 'the station is worth showing';
    assert (archive -> 0 ->> 'amount')::numeric = 2400, 'and what it cost';

    -- It is gone from the ordinary view of the world.
    assert not exists (select 1 from public.fuel_logs where id = older),
      'an archived fill should be invisible to the read policy';

    perform public.restore_record('fuel', older);

    assert exists (select 1 from public.fuel_logs where id = older),
      'restoring should put it back where everybody can see it';
    assert public.archived_records() = '[]'::jsonb, 'and take it out of the archive';

    -- The point of the whole exercise. The reading was applied when the fill
    -- was recorded and a later fill has since passed it, so putting this one
    -- back has nothing to say about where the van is now.
    select current_odometer into reading from public.vehicles where id = v;
    assert reading = 13000,
      'restoring an older fill must leave the odometer alone, got ' || reading;

    -- The most recent fill is the one holding the reading up. Archiving and
    -- restoring it should still land exactly where it started.
    perform public.archive_fuel_log(newer);
    perform public.restore_record('fuel', newer);

    select current_odometer into reading from public.vehicles where id = v;
    assert reading = 13000, 'and restoring the newest fill should not move it either, got '
      || reading;
  end $$;
rollback;

-- ---------------------------------------------------------------------------
-- A trip takes its people with it, both ways
-- ---------------------------------------------------------------------------
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'd0000000-0000-0000-0000-000000000001';

  do $$
  declare
    v uuid;
    trip uuid;
  begin
    insert into public.vehicles (vehicle_name, vehicle_type, fuel_type, current_odometer)
    values ('Trip Van', 'van', 'diesel', 5000) returning id into v;

    insert into public.trips (vehicle_id, departure_time, reason, status)
    values (v, now() - interval '3 days', 'Client delivery', 'completed')
    returning id into trip;

    insert into public.trip_drivers (trip_id, driver_name) values (trip, 'Joel');
    insert into public.trip_passengers (trip_id, passenger_name) values (trip, 'Rina');
    insert into public.trip_destinations (trip_id, destination_name) values (trip, 'Cavite');

    perform public.archive_trip(trip);

    assert not exists (select 1 from public.trip_drivers where trip_id = trip),
      'archiving a trip should take its drivers out of sight';

    perform public.restore_record('trip', trip);

    assert exists (select 1 from public.trips where id = trip), 'the trip should be back';
    assert exists (select 1 from public.trip_drivers where trip_id = trip),
      'and so should its driver';
    assert exists (select 1 from public.trip_passengers where trip_id = trip),
      'and its passenger';
    assert exists (select 1 from public.trip_destinations where trip_id = trip),
      'and where it went';
  end $$;
rollback;

-- ---------------------------------------------------------------------------
-- An expense that belongs to no vehicle
-- ---------------------------------------------------------------------------
--
-- The only table here whose vehicle is optional, which makes it the one that
-- catches a restore checked by asking which vehicle it belonged to.
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'd0000000-0000-0000-0000-000000000001';

  do $$
  declare
    spend uuid;
    archive jsonb;
  begin
    insert into public.expenses (vehicle_id, expense_date, category, description, amount)
    values (null, current_date, 'office', 'Printer ink', 850) returning id into spend;

    perform public.archive_expense(spend);

    archive := public.archived_records();
    assert archive -> 0 ->> 'vehicleName' = 'No vehicle',
      'an expense with no vehicle should say so rather than showing nothing';

    perform public.restore_record('expense', spend);

    assert exists (select 1 from public.expenses where id = spend),
      'an expense with no vehicle should restore like any other';
  end $$;
rollback;

-- ---------------------------------------------------------------------------
-- A reminder comes back on its own dates, not today's
-- ---------------------------------------------------------------------------
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'd0000000-0000-0000-0000-000000000001';

  do $$
  declare
    v uuid;
    template uuid;
    setting_id uuid;
    schedule record;
    due date;
  begin
    insert into public.vehicles (vehicle_name, vehicle_type, fuel_type, current_odometer)
    values ('Reminder Van', 'van', 'diesel', 20000) returning id into v;
    select id into template from public.maintenance_templates
    where template_key = 'engine_oil_change';

    setting_id := public.upsert_vehicle_maintenance_setting(
      vehicle_id => v, template_id => template,
      custom_time_interval_days => 180, custom_odometer_interval_km => 5000
    );

    -- Put it in the past, so a reminder rescheduled from today is obvious.
    update public.maintenance_schedules
    set next_due_date = current_date - 5, status = 'overdue'
    where vehicle_maintenance_setting_id = setting_id;

    select next_due_date into due from public.maintenance_schedules
    where vehicle_maintenance_setting_id = setting_id;

    perform public.archive_vehicle_maintenance_setting(setting_id);

    select * into schedule from public.maintenance_schedules
    where vehicle_maintenance_setting_id = setting_id;
    assert schedule.archived_at is not null, 'archiving the reminder archives its schedule';
    assert schedule.status = 'disabled', 'and disables it';

    perform public.restore_record('reminder', setting_id);

    assert exists (select 1 from public.vehicle_maintenance_settings
                   where id = setting_id and status = 'active'),
      'the reminder should be switched back on';

    select * into schedule from public.maintenance_schedules
    where vehicle_maintenance_setting_id = setting_id;

    assert schedule.archived_at is null, 'and its schedule back in circulation';
    assert schedule.next_due_date = due,
      'on the date it already had — a reminder rescheduled from today is a '
      || 'different reminder, got ' || schedule.next_due_date;
    assert schedule.status = 'overdue',
      'still overdue, because it still is, got ' || schedule.status;
  end $$;
rollback;

-- ---------------------------------------------------------------------------
-- Who may do this
-- ---------------------------------------------------------------------------
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'd0000000-0000-0000-0000-000000000001';

  do $$
  declare
    v uuid;
  begin
    insert into public.vehicles (vehicle_name, vehicle_type, fuel_type, current_odometer)
    values ('Permission Van', 'van', 'diesel', 100) returning id into v;

    -- A fixed id, because the manager below cannot look it up: an archived row
    -- is invisible to them, which is the rule being tested.
    insert into public.trips (id, vehicle_id, departure_time, reason)
    values ('d1000000-0000-0000-0000-000000000001', v, now(), 'Errand');

    perform public.archive_trip('d1000000-0000-0000-0000-000000000001');
  end $$;

  set local request.jwt.claim.sub = 'd0000000-0000-0000-0000-000000000002';

  do $$
  declare
    trip uuid := 'd1000000-0000-0000-0000-000000000001';
    refused boolean;
    message text;
  begin
    refused := false;
    begin
      perform public.archived_records();
    exception when others then
      refused := true;
      message := sqlerrm;
    end;
    assert refused, 'a manager should not be able to browse the archive';
    assert message = 'Only the owner can see archived records.',
      'and should be told why, got: ' || coalesce(message, '(none)');

    refused := false;
    begin
      perform public.restore_record('trip', trip);
    exception when others then
      refused := true;
      message := sqlerrm;
    end;
    assert refused, 'nor bring something back';
    assert message = 'Only the owner can restore an archived record.',
      'in words that name the rule, got: ' || coalesce(message, '(none)');
  end $$;

  set local request.jwt.claim.sub = 'd0000000-0000-0000-0000-000000000001';

  do $$
  begin
    assert jsonb_array_length(public.archived_records()) = 1,
      'and the trip should still be sitting in the archive afterwards';
  end $$;
rollback;

-- ---------------------------------------------------------------------------
-- Asking for something that is not there
-- ---------------------------------------------------------------------------
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'd0000000-0000-0000-0000-000000000001';

  do $$
  declare
    v uuid;
    trip uuid;
    refused boolean;
    message text;
  begin
    insert into public.vehicles (vehicle_name, vehicle_type, fuel_type, current_odometer)
    values ('Live Van', 'van', 'diesel', 100) returning id into v;

    insert into public.trips (vehicle_id, departure_time, reason)
    values (v, now(), 'Errand') returning id into trip;

    -- A trip that is not archived. Two people looking at the same screen, one
    -- of them a moment behind, is how this happens rather than by anybody
    -- doing something odd.
    refused := false;
    begin
      perform public.restore_record('trip', trip);
    exception when others then
      refused := true;
      message := sqlerrm;
    end;
    assert refused, 'restoring something that is not archived should not silently pass';
    assert message = 'That record was not found, or it is not archived.',
      'got: ' || coalesce(message, '(none)');

    refused := false;
    begin
      perform public.restore_record('spaceship', trip);
    exception when others then
      refused := true;
      message := sqlerrm;
    end;
    assert refused, 'and an unknown kind should be refused rather than ignored';
  end $$;
rollback;

-- ---------------------------------------------------------------------------
-- Why archiving goes through a function at all
-- ---------------------------------------------------------------------------
--
-- This is the regression guard for migration 31. Writing `deleted_at` straight
-- from the client is refused — the read policy filters on that column and
-- Postgres applies it to the row the update is about to produce — and the whole
-- app did exactly that until the restore work turned it up. Pinned here so that
-- somebody simplifying the archive functions back into a plain update finds out
-- from a test rather than from the client.
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'd0000000-0000-0000-0000-000000000001';

  do $$
  declare
    v uuid;
    trip uuid;
    refused boolean := false;
  begin
    insert into public.vehicles (vehicle_name, vehicle_type, fuel_type, current_odometer)
    values ('Direct Van', 'van', 'diesel', 100) returning id into v;

    insert into public.trips (vehicle_id, departure_time, reason)
    values (v, now(), 'Errand') returning id into trip;

    begin
      update public.trips set deleted_at = now() where id = trip;
    exception when insufficient_privilege then
      refused := true;
    end;

    assert refused,
      'a direct soft delete should still be refused — if this ever passes, the '
      || 'read policy has stopped hiding archived rows';
  end $$;
rollback;

-- ---------------------------------------------------------------------------
-- An account that is not active archives nothing
-- ---------------------------------------------------------------------------
--
-- The policies used to enforce this. The archive functions run as the definer
-- now, which switches the policies off, so the check has to be written out —
-- and therefore has to be tested.
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'd0000000-0000-0000-0000-000000000001';

  do $$
  declare
    v uuid;
  begin
    insert into public.vehicles (id, vehicle_name, vehicle_type, fuel_type, current_odometer)
    values ('a1000000-0000-0000-0000-000000000001', 'Pending Van', 'van', 'diesel', 100)
    returning id into v;

    insert into public.trips (id, vehicle_id, departure_time, reason)
    values ('d1000000-0000-0000-0000-000000000002', v, now(), 'Errand');
  end $$;

  -- Suspended between the two blocks, so the trip above already exists.
  set local role postgres;
  update public.profiles set status = 'inactive'
  where id = 'd0000000-0000-0000-0000-000000000002';

  set local role authenticated;
  set local request.jwt.claim.sub = 'd0000000-0000-0000-0000-000000000002';

  do $$
  declare
    refused boolean := false;
    message text;
  begin
    begin
      perform public.archive_trip('d1000000-0000-0000-0000-000000000002');
    exception when others then
      refused := true;
      message := sqlerrm;
    end;

    assert refused, 'a deactivated account should not be able to archive a trip';
    assert message = 'Your account is not active, so it cannot archive records.',
      'and should be told which rule stopped it, got: ' || coalesce(message, '(none)');
  end $$;
rollback;

select 'archived records can be found and put back' as result;
