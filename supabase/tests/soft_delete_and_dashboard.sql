-- Soft deletes reaching the children, and the dashboard.

do $$
declare
  v uuid;
  trip uuid;
begin
  insert into public.vehicles (vehicle_name, vehicle_type, fuel_type, current_odometer)
  values ('Cascade Van', 'van', 'diesel', 1000) returning id into v;

  insert into public.trips (vehicle_id, departure_time, reason)
  values (v, now(), 'Delivery') returning id into trip;
  insert into public.trip_drivers (trip_id, driver_name) values (trip, 'Maria Santos');
  insert into public.trip_passengers (trip_id, passenger_name) values (trip, 'Ana Cruz');
  insert into public.trip_destinations (trip_id, destination_name) values (trip, 'Cebu Depot');

  -- ----------------------------------------------------------------------
  -- Removing a trip takes its people with it
  -- ----------------------------------------------------------------------
  update public.trips set deleted_at = now() where id = trip;

  assert (select count(*) from public.trip_drivers
          where trip_id = trip and deleted_at is null) = 0,
    'a removed trip must not leave its drivers behind';
  assert (select count(*) from public.trip_passengers
          where trip_id = trip and deleted_at is null) = 0,
    'nor its passengers';
  assert (select count(*) from public.trip_destinations
          where trip_id = trip and deleted_at is null) = 0,
    'nor its destinations';

  -- ...and putting it back brings them along.
  update public.trips set deleted_at = null where id = trip;
  assert (select count(*) from public.trip_drivers
          where trip_id = trip and deleted_at is null) = 1,
    'restoring a trip should restore its drivers';

  -- ----------------------------------------------------------------------
  -- Removing a vehicle takes its reminders out of circulation
  -- ----------------------------------------------------------------------
  declare
    t uuid;
    setting_id uuid;
  begin
    select id into t from public.maintenance_templates where template_key = 'engine_oil_change';
    setting_id := public.upsert_vehicle_maintenance_setting(
      vehicle_id => v, template_id => t, custom_time_interval_days => 1
    );
    perform public.refresh_maintenance_alerts_for_vehicle(v);

    update public.vehicles set deleted_at = now() where id = v;

    assert (select count(*) from public.maintenance_schedules
            where vehicle_id = v and deleted_at is null) = 0,
      'a removed vehicle should take its schedules out of circulation';
    assert (select count(*) from public.vehicle_maintenance_settings
            where vehicle_id = v and deleted_at is null) = 0,
      'and its reminders';
    assert (select count(*) from public.alerts
            where vehicle_id = v and status = 'active') = 0,
      'and stop alerting';
  end;
end $$;

-- ---------------------------------------------------------------------------
-- The dashboard
-- ---------------------------------------------------------------------------
do $$
declare
  overview jsonb;
  v uuid;
  t uuid;
begin
  -- Empty to begin with, and it must not fall over on an empty fleet.
  overview := public.dashboard_overview();
  assert (overview->'vehicleSummary'->>'totalCount')::int = 0, 'a new system has no vehicles';
  assert overview->'maintenanceSummary'->'upcoming' = '[]'::jsonb, 'and nothing upcoming';
  assert (overview->'costSummary'->>'totalTrackedCost')::numeric = 0, 'and nothing spent';
  assert overview->>'preferredCurrency' = 'PHP', 'the currency should come from settings';
  assert overview->'setupHints'->0->>'code' = 'add_first_vehicle',
    'an empty system should suggest adding a vehicle first';
  assert overview->'backupSummary'->>'message' like '%automatically%',
    'the backup panel should explain that it is handled, not leave people wondering';

  insert into public.vehicles (vehicle_name, vehicle_type, fuel_type, current_odometer)
  values ('Dashboard Van', 'van', 'diesel', 5000) returning id into v;
  select id into t from public.maintenance_templates where template_key = 'engine_oil_change';

  -- Something overdue.
  perform public.upsert_vehicle_maintenance_setting(
    vehicle_id => v, template_id => t, custom_time_interval_days => 1
  );
  update public.maintenance_schedules set next_due_date = current_date - 30 where vehicle_id = v;
  perform public.refresh_maintenance_alerts_for_vehicle(v);

  -- Something spent this month.
  insert into public.fuel_logs
    (vehicle_id, fuel_date, odometer, fuel_type, liters, total_amount, is_full_tank)
  values (v, now(), 5000, 'diesel', 40, 2000, true);

  overview := public.dashboard_overview();
  assert (overview->'vehicleSummary'->>'activeCount')::int = 1, 'one active vehicle';
  assert overview->'vehicleSummary'->>'latestVehicleName' = 'Dashboard Van',
    'the newest vehicle should be named';
  assert (overview->'maintenanceSummary'->>'overdueCount')::int = 1, 'one overdue item';
  assert jsonb_array_length(overview->'maintenanceSummary'->'upcoming') = 1,
    'the overdue item should be listed';
  assert overview->'maintenanceSummary'->'upcoming'->0->>'vehicleName' = 'Dashboard Van',
    'and should name the vehicle';
  assert overview->'maintenanceSummary'->'upcoming'->0->>'dueReason' like 'Overdue by%',
    'and say why, got: '
      || coalesce(overview->'maintenanceSummary'->'upcoming'->0->>'dueReason', 'null');
  assert (overview->'alertsSummary'->>'activeCount')::int = 1, 'one active alert';
  assert jsonb_array_length(overview->'alertsSummary'->'topAlerts') = 1,
    'the alert should be listed';
  assert overview->'alertsSummary'->'topAlerts'->0->>'vehicleName' = 'Dashboard Van',
    'and name its vehicle';
  assert (overview->'costSummary'->>'fuelTotal')::numeric = 2000, 'fuel spend this month';
  assert jsonb_array_length(overview->'recentActivity') = 1, 'one recent thing happened';
  assert overview->'fuelSummary'->>'message' = 'Not enough full-tank fuel logs yet.',
    'one fill produces no official reading yet, got: '
      || (overview->'fuelSummary'->>'message');

  -- The dashboard must not double count either.
  insert into public.expenses
    (vehicle_id, expense_date, category, description, amount,
     related_record_type, related_record_id)
  values (v, current_date, 'fuel', 'Same fuel, typed again', 2000, 'fuel_log',
          (select id from public.fuel_logs where vehicle_id = v limit 1));

  overview := public.dashboard_overview();
  assert (overview->'costSummary'->>'totalTrackedCost')::numeric = 2000,
    'the dashboard must not count a mirrored expense twice, got '
      || (overview->'costSummary'->>'totalTrackedCost');
end $$;

select 'soft deletes reach the children and the dashboard adds up' as result;
