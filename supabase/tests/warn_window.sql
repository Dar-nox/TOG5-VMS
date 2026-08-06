-- A warning must be shorter than the thing it warns about.
--
-- The client's fleet had two items whose warn window was its own interval, so
-- both read "Due Soon" from the day they were logged until the day they came
-- due — one of them a decade out.

do $$
begin
  -- The rule itself.
  assert public.fitted_warn_window(14, 180, 14) = 14,
    'a window well inside its interval is left alone';
  assert public.fitted_warn_window(179, 180, 14) = 179,
    'one day short of the interval is still a choice somebody made';
  assert public.fitted_warn_window(180, 180, 14) = 14,
    'a window as long as its interval falls back to the default';
  assert public.fitted_warn_window(3600, 3600, 14) = 14,
    'the reported case: a ten-year interval warned about for ten years';
  assert public.fitted_warn_window(100000, 100000, 500) = 500,
    'the same on the odometer side, with the km default';
  assert public.fitted_warn_window(14, 3, 14) = 2,
    'when even the default does not fit, one unit short of the interval';
  assert public.fitted_warn_window(14, 1, 14) = 0,
    'an interval of one leaves no room to warn at all';
  assert public.fitted_warn_window(14, null, 14) = 14,
    'no interval to compare against leaves the window alone';
  assert public.fitted_warn_window(null, 180, 14) is null,
    'nothing in, nothing out';

  -- What the reported row did before the fix, and does after.
  assert (public.evaluate_due_status(
            '2026-08-05', 216880, '2036-05-28', 316867, 3600, 100000, false)).status = 'due_soon',
    'the old thresholds are what made it read due soon';
  assert (public.evaluate_due_status(
            '2026-08-05', 216880, '2036-05-28', 316867,
            public.fitted_warn_window(3600, 3600, 14),
            public.fitted_warn_window(100000, 100000, 500), false)).status = 'not_due',
    'fitted thresholds leave a decade away as not due';
end $$;

-- ---------------------------------------------------------------------------
-- Refused on the way in
-- ---------------------------------------------------------------------------
do $$
declare
  refused boolean;
begin
  refused := false;
  begin
    perform public.validated_maintenance_template(
      'Warns longer than it waits', 'engine_oil', null,
      180, null, 180, null, 'medium'
    );
  exception when others then
    refused := true;
  end;
  assert refused, 'a warn window at its own day interval must be refused';

  refused := false;
  begin
    perform public.validated_maintenance_template(
      'Warns further than it drives', 'engine_oil', null,
      null, 5000, null, 6000, 'medium'
    );
  exception when others then
    refused := true;
  end;
  assert refused, 'a warn window beyond its own km interval must be refused';

  -- A window that was never asked for is fitted rather than refused: a
  -- seven-day interval against the standard fourteen-day default is the
  -- system's mismatch, not the user's mistake.
  assert (public.validated_maintenance_template(
            'Fits itself to a short interval', 'engine_oil', null,
            7, null, null, null, 'medium')).default_due_soon_days = 6,
    'an unasked-for default is fitted to the interval, not refused';
end $$;

-- ---------------------------------------------------------------------------
-- Fitted however the row arrives
-- ---------------------------------------------------------------------------
--
-- The case this exists for is go-live day: migrate_from_backup.py inserts
-- straight through PostgREST, so it never passes the functions above. If the
-- rule lived only there, importing the client's records would bring the fault
-- back and undo the correction that was written for exactly those records.
do $$
declare
  vehicle uuid;
  template uuid;
  setting uuid;
  stored integer;
begin
  insert into public.vehicles (vehicle_name, vehicle_type, fuel_type, current_odometer)
  values ('Import test van', 'van', 'diesel', 100000)
  returning id into vehicle;

  -- Straight into the table, exactly as the importer does it.
  insert into public.maintenance_templates
    (name, category, default_time_interval_days, default_odometer_interval_km,
     default_due_soon_days, default_due_soon_km)
  values ('Imported item', 'engine_oil', 3600, 100000, 3600, 100000)
  returning id into template;

  select default_due_soon_days into stored
  from public.maintenance_templates where id = template;
  assert stored = 14, 'an imported item should not warn for its whole interval, got ' || stored;

  insert into public.vehicle_maintenance_settings
    (vehicle_id, template_id, status, custom_time_interval_days,
     custom_odometer_interval_km, custom_due_soon_days, custom_due_soon_km)
  values (vehicle, template, 'active', 3600, 100000, 3600, 100000)
  returning id into setting;

  select custom_due_soon_days into stored
  from public.vehicle_maintenance_settings where id = setting;
  assert stored = 14, 'an imported reminder should be fitted too, got ' || stored;

  insert into public.maintenance_schedules
    (vehicle_id, template_id, vehicle_maintenance_setting_id,
     next_due_date, next_due_odometer, due_soon_days, due_soon_km, status, priority)
  values (vehicle, template, setting,
          current_date + 3583, 316867, 3600, 100000, 'due_soon', 'medium');

  select due_soon_days into stored
  from public.maintenance_schedules where vehicle_maintenance_setting_id = setting;
  assert stored = 14,
    'a schedule borrows its interval from the setting it came from, got ' || stored;

  assert (select (public.evaluate_due_status(
                    current_date, v.current_odometer, m.next_due_date, m.next_due_odometer,
                    m.due_soon_days, m.due_soon_km, false)).status
          from public.maintenance_schedules m
          join public.vehicles v on v.id = m.vehicle_id
          where m.vehicle_maintenance_setting_id = setting) = 'not_due',
    'the reported row, imported afresh, must no longer read due soon';
end $$;

select 'warn windows stay shorter than their intervals' as result;
