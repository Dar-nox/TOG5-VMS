-- Retiring a vehicle stops it asking for attention.
--
-- `refresh_maintenance_alerts_for_vehicle` has always known that an archived
-- vehicle should raise nothing — but archiving one never called it. The app
-- writes `status = 'archived'` straight to the row, nothing recalculates, and
-- the alerts it already had stay active.
--
-- What makes that worse than it sounds is where they stay. The vehicle drops
-- out of the fleet list, so the alerts name something the client cannot open,
-- on the Alerts screen and in the daily digest, until some unrelated refresh
-- happens to clear them.

do $$
declare
  v uuid;
  template uuid;
  setting_id uuid;
begin
  insert into public.vehicles (vehicle_name, vehicle_type, fuel_type, current_odometer)
  values ('Retiring Van', 'van', 'diesel', 50000) returning id into v;

  select id into template from public.maintenance_templates
  where template_key = 'engine_oil_change';

  setting_id := public.upsert_vehicle_maintenance_setting(
    vehicle_id => v, template_id => template,
    custom_time_interval_days => 90, custom_odometer_interval_km => 5000
  );

  -- Overdue, so there is something real to be nagged about.
  update public.maintenance_schedules
  set next_due_date = current_date - 10
  where vehicle_maintenance_setting_id = setting_id;

  perform public.refresh_maintenance_alerts_for_vehicle(v);

  assert (select count(*) from public.alerts
          where vehicle_id = v and status = 'active' and deleted_at is null) > 0,
    'the overdue reminder should have raised an alert to begin with';

  -- ----------------------------------------------------------------------
  -- Archiving it, exactly as the app does
  -- ----------------------------------------------------------------------
  update public.vehicles
  set status = 'archived', archived_at = now()
  where id = v;

  assert (select count(*) from public.alerts
          where vehicle_id = v and status = 'active' and deleted_at is null) = 0,
    'a retired vehicle should stop raising alerts the moment it is retired, '
    || 'not whenever something else happens to recalculate';

  -- The reminder itself is kept. Retiring a vehicle is not the same as saying
  -- the servicing never mattered, and bringing it back should not mean setting
  -- every interval up again.
  assert exists (select 1 from public.vehicle_maintenance_settings
                 where id = setting_id and deleted_at is null),
    'archiving a vehicle should keep its reminders, not delete them';

  -- ----------------------------------------------------------------------
  -- And back again
  -- ----------------------------------------------------------------------
  update public.vehicles
  set status = 'active', archived_at = null
  where id = v;

  assert (select count(*) from public.alerts
          where vehicle_id = v and status = 'active' and deleted_at is null) > 0,
    'bringing a vehicle back should bring back what it is overdue for';
end $$;

select 'a retired vehicle stops asking for attention' as result;
