-- How maintenance alerts appear, change, and stop.
--
-- Ported from the alert tests in src-tauri/src/maintenance/scheduling.rs. The
-- rule that matters most is the last one: a dismissed alert is never raised
-- again for that schedule and reason. Losing it would nag people with alerts
-- they have already consciously waved away.

create or replace function pg_temp.setup_vehicle(
  vehicle_name text,
  next_due_date date,
  next_due_odometer numeric,
  current_odometer numeric default 1000
)
returns uuid
language plpgsql
as $$
declare
  v_id uuid;
  t_id uuid;
begin
  insert into public.vehicles (vehicle_name, vehicle_type, fuel_type, current_odometer)
  values (vehicle_name, 'van', 'diesel', current_odometer)
  returning id into v_id;

  select id into t_id from public.maintenance_templates
  where template_key = 'engine_oil_change';

  insert into public.maintenance_schedules
    (vehicle_id, template_id, next_due_date, next_due_odometer,
     due_soon_days, due_soon_km, priority)
  values (v_id, t_id, next_due_date, next_due_odometer, 14, 500, 'medium');

  return v_id;
end;
$$;

do $$
declare
  v_id uuid;
  r public.alert_refresh_result;
  a record;
begin
  -- ----------------------------------------------------------------------
  -- An overdue schedule raises exactly one alert, and refreshing is safe
  -- ----------------------------------------------------------------------
  v_id := pg_temp.setup_vehicle('Overdue Van', current_date - 10, null);
  r := public.refresh_maintenance_alerts_for_vehicle(v_id);
  assert r.created_count = 1, 'an overdue schedule should raise one alert';

  select * into a from public.alerts where vehicle_id = v_id and status = 'active';
  assert a.alert_type = 'overdue_by_date', 'unexpected alert type: ' || a.alert_type;
  assert a.priority = 'critical', 'overdue work is critical, got ' || a.priority;
  assert a.title = 'Engine Oil Change is overdue', 'unexpected title: ' || a.title;
  assert a.message like '%Overdue Van%', 'the message should name the vehicle';

  r := public.refresh_maintenance_alerts_for_vehicle(v_id);
  assert r.created_count = 0, 'refreshing must not raise a duplicate';
  assert r.updated_count = 1, 'refreshing should refresh the wording';
  assert (select count(*) from public.alerts
          where vehicle_id = v_id and status = 'active') = 1,
    'there should still be exactly one active alert';

  -- ----------------------------------------------------------------------
  -- Once the work is no longer due, the alert resolves itself
  -- ----------------------------------------------------------------------
  update public.maintenance_schedules
  set next_due_date = current_date + 365
  where vehicle_id = v_id;

  r := public.refresh_maintenance_alerts_for_vehicle(v_id);
  assert r.resolved_count = 1, 'work that is no longer due should resolve its alert';
  assert (select count(*) from public.alerts
          where vehicle_id = v_id and status = 'active') = 0,
    'nothing should still be shouting';

  -- ----------------------------------------------------------------------
  -- Dismissing is permanent for that schedule and reason
  -- ----------------------------------------------------------------------
  v_id := pg_temp.setup_vehicle('Dismissed Van', current_date - 5, null);
  r := public.refresh_maintenance_alerts_for_vehicle(v_id);
  assert r.created_count = 1, 'expected an alert to dismiss';

  perform public.dismiss_alert(
    (select id from public.alerts where vehicle_id = v_id and status = 'active')
  );

  r := public.refresh_maintenance_alerts_for_vehicle(v_id);
  assert r.created_count = 0,
    'a dismissed alert must never be raised again for that schedule and reason';
  assert (select count(*) from public.alerts
          where vehicle_id = v_id and status = 'active') = 0,
    'dismissing should stay dismissed even as the work gets later';

  -- Even much later.
  update public.maintenance_schedules
  set next_due_date = current_date - 400
  where vehicle_id = v_id;
  r := public.refresh_maintenance_alerts_for_vehicle(v_id);
  assert r.created_count = 0, 'still dismissed a year later';

  -- ----------------------------------------------------------------------
  -- Switching alerts off stops new ones without hiding the status
  -- ----------------------------------------------------------------------
  v_id := pg_temp.setup_vehicle('Quiet Van', current_date - 3, null);
  update public.settings set value = 'false' where key = 'maintenance_alerts_enabled';

  r := public.refresh_maintenance_alerts_for_vehicle(v_id);
  assert r.created_count = 0, 'no alerts should be raised while they are switched off';
  assert (select status from public.maintenance_schedules where vehicle_id = v_id)
    = 'overdue',
    'the schedule should still know it is overdue even with alerts off';

  update public.settings set value = 'true' where key = 'maintenance_alerts_enabled';

  -- ----------------------------------------------------------------------
  -- Archiving a vehicle silences it
  -- ----------------------------------------------------------------------
  v_id := pg_temp.setup_vehicle('Archived Van', current_date - 30, null);
  r := public.refresh_maintenance_alerts_for_vehicle(v_id);
  assert r.created_count = 1, 'expected an alert before archiving';

  update public.vehicles set status = 'archived', archived_at = now() where id = v_id;

  -- No refresh call in between. Archiving is enough on its own now — a trigger
  -- does it (migration 33), because nothing ever called the refresh at the
  -- moment somebody retired a vehicle, and the alerts sat on a screen naming
  -- something that had left the fleet list.
  assert (select count(*) from public.alerts
          where vehicle_id = v_id and status = 'active') = 0,
    'an archived vehicle must not keep nagging';

  -- And asking again changes nothing, rather than finding work still to do.
  r := public.refresh_maintenance_alerts_for_vehicle(v_id);
  assert r.resolved_count = 0, 'the archiving should already have resolved them';
  assert r.created_count = 0, 'and an archived vehicle raises nothing new';

  -- ----------------------------------------------------------------------
  -- Changing why it is due swaps the alert rather than stacking one on top
  -- ----------------------------------------------------------------------
  v_id := pg_temp.setup_vehicle('Switching Van', current_date - 2, null, 1000);
  r := public.refresh_maintenance_alerts_for_vehicle(v_id);
  assert (select alert_type from public.alerts
          where vehicle_id = v_id and status = 'active') = 'overdue_by_date',
    'expected a date alert first';

  update public.maintenance_schedules
  set next_due_date = null, next_due_odometer = 900
  where vehicle_id = v_id;

  r := public.refresh_maintenance_alerts_for_vehicle(v_id);
  assert (select count(*) from public.alerts
          where vehicle_id = v_id and status = 'active') = 1,
    'the reason changed, so there should still be one alert and not two';
  assert (select alert_type from public.alerts
          where vehicle_id = v_id and status = 'active') = 'overdue_by_odometer',
    'the alert should now be about distance';

  -- ----------------------------------------------------------------------
  -- Fuel alerts are none of the maintenance refresh's business
  -- ----------------------------------------------------------------------
  insert into public.alerts (vehicle_id, alert_type, title, message, status)
  values (v_id, 'fuel_efficiency_drop', 'Fuel use is up',
          'This van is using more fuel than usual.', 'active');

  r := public.refresh_maintenance_alerts_for_vehicle(v_id);
  assert (select count(*) from public.alerts
          where vehicle_id = v_id and alert_type = 'fuel_efficiency_drop'
            and status = 'active') = 1,
    'the maintenance refresh must not touch a fuel alert';
end $$;

-- ---------------------------------------------------------------------------
-- Dismissing something that is not there
-- ---------------------------------------------------------------------------
do $$
declare
  refused boolean := false;
begin
  begin
    perform public.dismiss_alert(gen_random_uuid());
  exception when others then
    refused := true;
  end;
  assert refused, 'dismissing an alert that does not exist should say so';
end $$;

select 'maintenance alerts behave as they did on the desktop' as result;
