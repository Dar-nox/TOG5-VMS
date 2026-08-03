-- What the fleet costs, and not counting anything twice.
--
-- Ported from the report tests in src-tauri/src/expenses/repository.rs and
-- src-tauri/src/dashboard/repository.rs. The rule under test is the one the
-- desktop app implemented three separate times: an expense that mirrors a
-- fuel log or a service record must not be added on top of it.

do $$
declare
  v uuid;
  t uuid;
  fuel_id uuid;
  summary record;
begin
  insert into public.vehicles (vehicle_name, vehicle_type, fuel_type, current_odometer)
  values ('Costed Van', 'van', 'diesel', 10000) returning id into v;
  select id into t from public.maintenance_templates where template_key = 'brake_inspection';

  -- Fuel: 2,500
  insert into public.fuel_logs
    (vehicle_id, fuel_date, odometer, fuel_type, liters, total_amount, is_full_tank, station_name)
  values (v, '2026-03-01'::timestamptz, 10000, 'diesel', 50, 2500, true, 'Petron EDSA')
  returning id into fuel_id;

  -- Maintenance: 3,000
  insert into public.maintenance_logs
    (vehicle_id, template_id, completed_date, odometer, work_performed,
     labor_cost, parts_cost, total_cost)
  values (v, t, '2026-03-10', 10500, 'Brake pads', 1000, 2000, 3000);

  -- Repair: 4,000
  insert into public.repair_records
    (vehicle_id, repair_date, odometer, issue_description, total_cost)
  values (v, '2026-03-15', 11000, 'Alternator', 4000);

  -- A standalone expense: 500
  insert into public.expenses (vehicle_id, expense_date, category, description, amount)
  values (v, '2026-03-20', 'tolls', 'Expressway tolls', 500);

  select * into summary from public.vehicle_cost_summary() where vehicle_id = v;
  assert summary.fuel_total = 2500, 'fuel total wrong: ' || summary.fuel_total;
  assert summary.maintenance_total = 3000, 'maintenance total wrong: '
    || summary.maintenance_total;
  assert summary.repair_total = 4000, 'repair total wrong: ' || summary.repair_total;
  assert summary.expense_total = 500, 'expense total wrong: ' || summary.expense_total;
  assert summary.grand_total = 10000, 'grand total wrong: ' || summary.grand_total;

  -- ----------------------------------------------------------------------
  -- The same cost entered twice is only counted once
  -- ----------------------------------------------------------------------
  insert into public.expenses
    (vehicle_id, expense_date, category, description, amount,
     related_record_type, related_record_id)
  values (v, '2026-03-01', 'fuel', 'Same diesel, typed in again', 2500,
          'fuel_log', fuel_id);

  select * into summary from public.vehicle_cost_summary() where vehicle_id = v;
  assert summary.grand_total = 10000,
    'an expense mirroring a fuel log must not be added on top, got '
      || summary.grand_total;
  assert summary.expense_total = 500,
    'the mirrored expense must not appear in the expense column either, got '
      || summary.expense_total;

  -- An expense pointing at something else entirely still counts.
  insert into public.expenses
    (vehicle_id, expense_date, category, description, amount,
     related_record_type, related_record_id)
  values (v, '2026-03-22', 'parking', 'Overnight parking', 200, 'other', null);

  select * into summary from public.vehicle_cost_summary() where vehicle_id = v;
  assert summary.grand_total = 10200,
    'an unrelated expense should still count, got ' || summary.grand_total;

  -- ----------------------------------------------------------------------
  -- Cost per kilometre
  -- ----------------------------------------------------------------------
  -- Readings run 10000 to 11000, so 1000 km against 10,200.
  assert summary.distance_km = 1000, 'distance wrong: '
    || coalesce(summary.distance_km::text, 'null');
  assert summary.cost_per_km = round(10200::numeric / 1000, 2),
    'cost per km wrong: ' || coalesce(summary.cost_per_km::text, 'null');
  assert summary.cost_per_km_note is null, 'no note is needed when it can be worked out';

  -- ----------------------------------------------------------------------
  -- One reading is not a distance
  -- ----------------------------------------------------------------------
  declare
    lonely uuid;
  begin
    insert into public.vehicles (vehicle_name, vehicle_type, fuel_type, current_odometer)
    values ('One Reading Van', 'van', 'diesel', 500) returning id into lonely;
    insert into public.fuel_logs
      (vehicle_id, fuel_date, odometer, fuel_type, liters, total_amount, is_full_tank)
    values (lonely, '2026-03-01'::timestamptz, 500, 'diesel', 40, 2000, true);

    select * into summary from public.vehicle_cost_summary() where vehicle_id = lonely;
    assert summary.distance_km is null, 'a single reading spans no distance';
    assert summary.cost_per_km is null, 'so there is no cost per km';
    assert summary.cost_per_km_note like 'Needs at least two%',
      'and the report should explain why, got: ' || coalesce(summary.cost_per_km_note, 'null');
  end;

  -- ----------------------------------------------------------------------
  -- Filtering by date
  -- ----------------------------------------------------------------------
  select * into summary from public.vehicle_cost_summary('2026-03-01', '2026-03-10')
  where vehicle_id = v;
  assert summary.grand_total = 5500,
    'only the fuel and the maintenance fall in that window, got ' || summary.grand_total;

  -- ----------------------------------------------------------------------
  -- Grouping
  -- ----------------------------------------------------------------------
  assert (select total from public.cost_totals_by_category(v) where category = 'fuel') = 2500,
    'fuel category total wrong';
  assert (select total from public.cost_totals_by_month(v) where month = '2026-03') = 10200,
    'March total wrong';
end $$;

-- ---------------------------------------------------------------------------
-- Trips
-- ---------------------------------------------------------------------------
do $$
declare
  v uuid;
  trip uuid;
  flat record;
begin
  insert into public.vehicles (vehicle_name, vehicle_type, fuel_type, current_odometer)
  values ('Trip Van', 'van', 'diesel', 100) returning id into v;

  insert into public.trips (vehicle_id, departure_time, reason, status)
  values (v, '2026-04-01 08:00+08', 'Delivery', 'completed') returning id into trip;

  insert into public.trip_drivers (trip_id, driver_name, sort_order)
  values (trip, 'Maria Santos', 0), (trip, 'Carlos Reyes', 1);
  insert into public.trip_passengers (trip_id, passenger_name, sort_order)
  values (trip, 'Ana Cruz', 0);
  insert into public.trip_destinations (trip_id, destination_name, sort_order)
  values (trip, 'Cebu Depot', 0), (trip, 'Mandaue Yard', 1);

  select * into flat from public.trips_with_people where id = trip;
  assert flat.drivers = array['Maria Santos', 'Carlos Reyes'],
    'drivers should come back in order, got ' || flat.drivers::text;
  assert flat.passengers = array['Ana Cruz'], 'passengers wrong';
  assert flat.destinations = array['Cebu Depot', 'Mandaue Yard'], 'destinations wrong';
  assert flat.vehicle_name = 'Trip Van', 'the vehicle name should come along';

  assert (select trip_count from public.trip_top_counts('drivers')
          where name = 'Maria Santos') = 1,
    'driver counts wrong';
  assert (select trip_count from public.trip_top_counts('destinations')
          where name = 'Cebu Depot') = 1,
    'destination counts wrong';
end $$;

select 'cost reporting adds up without double counting' as result;
