-- How fuel efficiency is worked out.
--
-- Ported from the tests in src-tauri/src/fuel/repository.rs, plus the
-- checkpoint rule those tests never covered directly.

create or replace function pg_temp.new_vehicle(name text)
returns uuid
language sql
as $$
  insert into public.vehicles (vehicle_name, vehicle_type, fuel_type, current_odometer)
  values (name, 'van', 'diesel', 0)
  returning id;
$$;

create or replace function pg_temp.add_fuel(
  vehicle_id uuid, odometer numeric, liters numeric, amount numeric,
  full_tank boolean, fuel_type text default 'diesel'
)
returns uuid
language sql
as $$
  insert into public.fuel_logs
    (vehicle_id, fuel_date, odometer, fuel_type, liters, total_amount, is_full_tank)
  values (vehicle_id, (date '2026-01-01' + (odometer / 100)::integer)::timestamptz,
          odometer, fuel_type, liters, amount, full_tank)
  returning id;
$$;

do $$
declare
  v uuid;
  first_log uuid;
  second_log uuid;
  third_log uuid;
  s public.fuel_efficiency_summary;
begin
  -- ----------------------------------------------------------------------
  -- The first full tank has nothing to measure from
  -- ----------------------------------------------------------------------
  v := pg_temp.new_vehicle('Efficiency Van');
  first_log := pg_temp.add_fuel(v, 1000, 50, 2500, true);

  assert (select efficiency_status from public.fuel_logs where id = first_log)
    = 'not_computed',
    'the first fill has no earlier tank to measure from';

  -- ----------------------------------------------------------------------
  -- The second full tank gives a reading
  -- ----------------------------------------------------------------------
  second_log := pg_temp.add_fuel(v, 1500, 50, 2500, true);

  assert (select efficiency_status from public.fuel_logs where id = second_log)
    = 'official', 'a second full tank should produce a reading';
  assert (select computed_km_per_liter from public.fuel_logs where id = second_log)
    = 10, '500 km on 50 litres is 10 km/L';
  assert (select computed_l_per_100km from public.fuel_logs where id = second_log)
    = 10, '50 litres over 500 km is 10 L/100km';
  assert (select computed_cost_per_km from public.fuel_logs where id = second_log)
    = 5, '2500 over 500 km is 5 per km';

  -- ----------------------------------------------------------------------
  -- A partial fill is recorded but never counted
  -- ----------------------------------------------------------------------
  third_log := pg_temp.add_fuel(v, 1800, 20, 1000, false);
  assert (select efficiency_status from public.fuel_logs where id = third_log)
    = 'not_computed', 'a partial fill is not an official reading';

  -- ...and it does not become the point the next reading measures from.
  -- 1000 km since the last *full* tank, not 700 since the partial one.
  declare
    fourth_log uuid := pg_temp.add_fuel(v, 2500, 100, 5000, true);
  begin
    assert (select computed_km_per_liter from public.fuel_logs where id = fourth_log)
      = 10, 'distance is measured from the last full tank, not the last fill';
  end;

  -- ----------------------------------------------------------------------
  -- DEF/AdBlue is an additive, not fuel
  -- ----------------------------------------------------------------------
  v := pg_temp.new_vehicle('AdBlue Van');
  perform pg_temp.add_fuel(v, 1000, 50, 2500, true);
  declare
    def_log uuid := pg_temp.add_fuel(v, 1200, 10, 500, true, 'def_adblue');
    later_log uuid;
  begin
    assert (select efficiency_status from public.fuel_logs where id = def_log)
      = 'not_computed', 'topping up AdBlue is not a fuel reading';

    -- And it must not become the checkpoint either: the next fill should
    -- measure the full 500 km from the diesel fill, not 300 from the AdBlue.
    later_log := pg_temp.add_fuel(v, 1500, 50, 2500, true);
    assert (select computed_km_per_liter from public.fuel_logs where id = later_log)
      = 10, 'AdBlue must not become the point the next reading measures from';
  end;

  -- ----------------------------------------------------------------------
  -- Going backwards produces nothing rather than a negative reading
  -- ----------------------------------------------------------------------
  v := pg_temp.new_vehicle('Same Odometer Van');
  perform pg_temp.add_fuel(v, 1000, 50, 2500, true);
  declare
    same_log uuid := pg_temp.add_fuel(v, 1000, 50, 2500, true);
  begin
    assert (select efficiency_status from public.fuel_logs where id = same_log)
      = 'not_computed', 'no distance travelled means no reading';
  end;

  -- ----------------------------------------------------------------------
  -- The summary and the drop warning
  -- ----------------------------------------------------------------------
  v := pg_temp.new_vehicle('Summary Van');
  s := public.fuel_efficiency_summary_for_vehicle(v);
  assert s.official_log_count = 0, 'a new vehicle has no readings';
  assert s.warning like 'Add at least two%', 'unexpected warning: ' || coalesce(s.warning, '-');

  -- Four steady readings, then one much worse.
  perform pg_temp.add_fuel(v, 1000, 50, 2500, true);
  perform pg_temp.add_fuel(v, 1500, 50, 2500, true);
  perform pg_temp.add_fuel(v, 2000, 50, 2500, true);
  perform pg_temp.add_fuel(v, 2500, 50, 2500, true);

  s := public.fuel_efficiency_summary_for_vehicle(v);
  assert s.official_log_count = 3, 'three of the four fills produced readings';
  assert not s.efficiency_drop_detected,
    'steady consumption is not a drop';

  perform pg_temp.add_fuel(v, 3000, 100, 5000, true);
  s := public.fuel_efficiency_summary_for_vehicle(v);
  assert s.official_log_count = 4, 'now there are four readings';
  assert s.latest_km_per_liter = 5, 'the latest reading is 5 km/L';
  assert s.recent_average_km_per_liter = 10, 'the three before it averaged 10 km/L';
  assert s.efficiency_drop_detected,
    'half the usual efficiency is well past the 20% threshold';
  assert s.warning like '%more than 20%%', 'unexpected warning: ' || coalesce(s.warning, '-');

  assert (select count(*) from public.alerts
          where vehicle_id = v and alert_type = 'fuel_efficiency_drop' and status = 'active') = 1,
    'a sustained drop should raise exactly one alert';

  -- Recovering resolves it, with no dismissal memory to get in the way.
  perform pg_temp.add_fuel(v, 3500, 50, 2500, true);
  assert (select count(*) from public.alerts
          where vehicle_id = v and alert_type = 'fuel_efficiency_drop' and status = 'active') = 0,
    'efficiency recovering should clear the alert';

  -- ----------------------------------------------------------------------
  -- Just under the threshold is not a drop
  -- ----------------------------------------------------------------------
  v := pg_temp.new_vehicle('Borderline Van');
  perform pg_temp.add_fuel(v, 1000, 50, 2500, true);
  perform pg_temp.add_fuel(v, 1500, 50, 2500, true);
  perform pg_temp.add_fuel(v, 2000, 50, 2500, true);
  perform pg_temp.add_fuel(v, 2500, 50, 2500, true);
  -- 8.5 km/L against an average of 10 is a 15% drop: noticeable, not alarming.
  perform pg_temp.add_fuel(v, 3000, 500.0 / 8.5, 2500, true);
  s := public.fuel_efficiency_summary_for_vehicle(v);
  assert not s.efficiency_drop_detected,
    'a 15% dip should not raise an alarm, got latest '
      || coalesce(s.latest_km_per_liter::text, '-');
end $$;

select 'fuel efficiency matches the desktop rules' as result;
