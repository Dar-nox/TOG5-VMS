-- What the archive can tell you about what is in it.
--
-- `archived_records` returns one 8-key shape for four different kinds of
-- record, and the first version filled in only the keys every kind happened to
-- share. Everything else was hard-coded null: three of the eight for a trip,
-- four for a reminder.
--
-- On screen that left a reminder showing its name and the date it was archived
-- and nothing else — not the interval, not when it was last done, not even
-- which of two similarly named items it was. The client asked how they were
-- supposed to decide whether to restore one, which is the whole point of the
-- screen.
--
-- These assertions are about the shape of the answer rather than exact wording,
-- so rephrasing a detail line does not break them.

insert into auth.users (id, email, raw_user_meta_data)
values ('d0000000-0000-0000-0000-00000000ae01', 'archive-detail@tog5.test',
        '{"display_name": "Archive Reader"}'::jsonb);

set request.jwt.claim.sub = 'd0000000-0000-0000-0000-00000000ae01';

do $$
declare
  van uuid;
  template uuid;
  setting_id uuid;
  the_trip uuid;
  fuel_id uuid;
  expense_id uuid;
  records jsonb;
  item jsonb;
begin
  -- `archived_records` is owner-only, and the stub account above lands as a
  -- manager.
  update public.profiles set role = 'owner'
  where id = 'd0000000-0000-0000-0000-00000000ae01';

  insert into public.vehicles (vehicle_name, vehicle_type, fuel_type, current_odometer)
  values ('Archive Detail Van', 'van', 'diesel', 20000) returning id into van;

  select id into template from public.maintenance_templates
  where template_key = 'engine_oil_change';

  -- ----------------------------------------------------------------------
  -- A reminder — the case with four nulls
  -- ----------------------------------------------------------------------
  setting_id := public.upsert_vehicle_maintenance_setting(
    vehicle_id => van, template_id => template,
    custom_time_interval_days => 90, custom_odometer_interval_km => 5000
  );

  update public.maintenance_schedules
  set last_completed_date = '2026-04-01', last_completed_odometer = 15000
  where vehicle_maintenance_setting_id = setting_id;

  perform public.archive_vehicle_maintenance_setting(setting_id);

  -- ----------------------------------------------------------------------
  -- A trip — three nulls, and the one with the most worth saying
  -- ----------------------------------------------------------------------
  the_trip := public.start_trip(
    vehicle_id => van, departure_time => '2026-05-04 08:00+08',
    reason => 'Delivery run', destinations => array['Batangas'],
    drivers => array['Ramon'], passengers => array['Ana'],
    departure_odometer => 20000
  );

  perform public.complete_trip(
    trip_id => the_trip, return_time => '2026-05-04 17:30+08',
    return_odometer => 20260
  );

  -- `save_expense` has no trip_id parameter; the app writes the link
  -- afterwards rather than restating that whole function for one nullable
  -- column (`expenses.ts`).
  expense_id := public.save_expense(
    vehicle_id => van, expense_date => '2026-05-04', category => 'Toll',
    description => 'SLEX', amount => 300
  );
  update public.expenses set trip_id = the_trip where id = expense_id;

  perform public.archive_trip(the_trip);

  -- ----------------------------------------------------------------------
  -- Fuel and an expense, which already carried some detail
  -- ----------------------------------------------------------------------
  insert into public.fuel_logs
    (vehicle_id, fuel_date, odometer, fuel_type, liters, total_amount,
     station_name, is_full_tank)
  values (van, '2026-05-05'::timestamptz, 20300, 'diesel', 40, 2400,
          'Shell EDSA', true)
  returning id into fuel_id;

  perform public.archive_fuel_log(fuel_id);

  expense_id := public.save_expense(
    vehicle_id => van, expense_date => '2026-05-06',
    category => 'Preventive Maintenance', description => 'Wiper blades',
    amount => 450
  );

  perform public.archive_expense(expense_id);

  records := public.archived_records();

  assert jsonb_array_length(records) >= 4,
    'expected all four kinds back, got ' || jsonb_array_length(records)::text;

  -- ----------------------------------------------------------------------
  -- A reminder says what it was set to do
  -- ----------------------------------------------------------------------
  select value into item from jsonb_array_elements(records) value
  where value->>'kind' = 'reminder' limit 1;

  assert item is not null, 'the archived reminder is missing entirely';
  assert item->>'detail' is not null,
    'a reminder should say what interval it was set to, not just its name';
  assert item->>'detail' like '%90%' and item->>'detail' like '%5,000%',
    'the interval should name both the days and the distance, got: '
    || coalesce(item->>'detail', 'null');
  assert item->>'occurredOn' is not null,
    'a reminder that has been done before should say when it was last done';

  -- ----------------------------------------------------------------------
  -- A trip says who drove it and where it went
  -- ----------------------------------------------------------------------
  select value into item from jsonb_array_elements(records) value
  where value->>'kind' = 'trip' limit 1;

  assert item is not null, 'the archived trip is missing entirely';
  assert item->>'detail' is not null,
    'a trip should say more than its reason — two trips called "Delivery run" '
    || 'are indistinguishable otherwise';
  assert item->>'detail' like '%Ramon%',
    'the detail should name the driver, got: ' || coalesce(item->>'detail', 'null');
  assert item->>'detail' like '%Batangas%',
    'the detail should say where it went, got: ' || coalesce(item->>'detail', 'null');
  assert item->>'amount' is not null,
    'a trip with an expense booked against it should show what it cost';
  assert (item->>'amount')::numeric = 300,
    'the trip cost should be its fuel plus its expenses, got ' || (item->>'amount');

  -- ----------------------------------------------------------------------
  -- Fuel keeps its station and gains the reading it was taken at
  -- ----------------------------------------------------------------------
  select value into item from jsonb_array_elements(records) value
  where value->>'kind' = 'fuel' limit 1;

  assert item->>'detail' like '%Shell EDSA%',
    'the station should survive, got: ' || coalesce(item->>'detail', 'null');
  assert item->>'detail' like '%20,300%',
    'fuel should say the odometer reading it was logged at, got: '
    || coalesce(item->>'detail', 'null');

  -- ----------------------------------------------------------------------
  -- An expense is unchanged — its category is turned into words by the app,
  -- which is where every other screen does it too
  -- ----------------------------------------------------------------------
  select value into item from jsonb_array_elements(records) value
  where value->>'kind' = 'expense' limit 1;

  assert item->>'detail' = 'preventive_maintenance',
    'the stored category key should come back as it is, got: '
    || coalesce(item->>'detail', 'null');
  assert (item->>'amount')::numeric = 450, 'the expense amount should survive';
end $$;

-- ---------------------------------------------------------------------------
-- A reminder that has never been done has nothing to say about when
-- ---------------------------------------------------------------------------
do $$
declare
  van uuid;
  template uuid;
  setting_id uuid;
  item jsonb;
begin
  insert into public.vehicles (vehicle_name, vehicle_type, fuel_type, current_odometer)
  values ('Never Serviced Van', 'van', 'diesel', 500) returning id into van;

  select id into template from public.maintenance_templates
  where template_key = 'engine_oil_change';

  setting_id := public.upsert_vehicle_maintenance_setting(
    vehicle_id => van, template_id => template,
    custom_time_interval_days => 180, custom_odometer_interval_km => null
  );

  perform public.archive_vehicle_maintenance_setting(setting_id);

  select value into item
  from jsonb_array_elements(public.archived_records()) value
  where value->>'id' = setting_id::text;

  assert item->>'occurredOn' is null,
    'a reminder nobody has ever acted on should leave the date empty rather '
    || 'than inventing one';
  assert item->>'detail' like '%180%',
    'a time-only reminder should still say its interval, got: '
    || coalesce(item->>'detail', 'null');
  assert item->>'detail' not like '%km%',
    'and should not mention a distance it does not have, got: '
    || coalesce(item->>'detail', 'null');
end $$;

select 'the archive can describe what is in it' as result;
