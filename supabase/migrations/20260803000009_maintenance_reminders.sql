-- Setting up a maintenance reminder for a vehicle.
--
-- Ported from src-tauri/src/maintenance/scheduling.rs:197. A "setting" is what
-- the user configures — how often this item is due for this vehicle. A
-- "schedule" is what the app derives from it: the next due date and reading.
-- The user only ever edits the first; the second is kept in step here.

-- Recomputes a vehicle's schedule from its setting. Called after the setting
-- changes and after work is completed against it.
create or replace function public.recalculate_schedule_for_setting(
  setting_id uuid,
  completed_date date default null,
  completed_odometer numeric default null
)
returns uuid
language plpgsql
as $$
declare
  setting record;
  base_date date;
  base_odometer numeric;
  computed_next_due_date date;
  computed_next_due_odometer numeric;
  computed_status text;
  setup_note text;
  existing_schedule uuid;
begin
  select s.id, s.vehicle_id, s.template_id, s.status,
         s.custom_time_interval_days, s.custom_odometer_interval_km,
         coalesce(s.custom_due_soon_days, t.default_due_soon_days) as due_soon_days,
         coalesce(s.custom_due_soon_km, t.default_due_soon_km) as due_soon_km,
         t.priority, v.current_odometer
  into setting
  from public.vehicle_maintenance_settings s
  join public.maintenance_templates t on t.id = s.template_id
  join public.vehicles v on v.id = s.vehicle_id
  where s.id = recalculate_schedule_for_setting.setting_id;

  if setting.id is null then
    return null;
  end if;

  base_date := coalesce(completed_date, current_date);
  base_odometer := coalesce(completed_odometer, setting.current_odometer);

  if setting.custom_time_interval_days is not null then
    computed_next_due_date := base_date + setting.custom_time_interval_days;
  end if;
  if setting.custom_odometer_interval_km is not null then
    computed_next_due_odometer := base_odometer + setting.custom_odometer_interval_km;
  end if;

  computed_status := (public.evaluate_due_status(
    base_date,
    greatest(setting.current_odometer, base_odometer),
    computed_next_due_date, computed_next_due_odometer,
    setting.due_soon_days, setting.due_soon_km,
    setting.status = 'disabled'
  )).status;

  -- A reminder with no interval at all is not broken, it is unfinished, and
  -- the note says so on the screen rather than leaving a blank row.
  if computed_next_due_date is null and computed_next_due_odometer is null then
    setup_note := 'No reminder interval is set yet.';
  end if;

  select id into existing_schedule
  from public.maintenance_schedules
  where vehicle_id = setting.vehicle_id
    and template_id = setting.template_id
    and deleted_at is null
  limit 1;

  if existing_schedule is not null then
    update public.maintenance_schedules
    set vehicle_maintenance_setting_id = setting.id,
        next_due_date = computed_next_due_date,
        next_due_odometer = computed_next_due_odometer,
        due_soon_days = setting.due_soon_days,
        due_soon_km = setting.due_soon_km,
        status = computed_status,
        priority = setting.priority,
        notes = setup_note,
        archived_at = null
    where id = existing_schedule;
    return existing_schedule;
  end if;

  insert into public.maintenance_schedules (
    vehicle_id, template_id, vehicle_maintenance_setting_id,
    next_due_date, next_due_odometer, due_soon_days, due_soon_km,
    status, priority, notes
  ) values (
    setting.vehicle_id, setting.template_id, setting.id,
    computed_next_due_date, computed_next_due_odometer,
    setting.due_soon_days, setting.due_soon_km,
    computed_status, setting.priority, setup_note
  )
  returning id into existing_schedule;

  return existing_schedule;
end;
$$;

create or replace function public.upsert_vehicle_maintenance_setting(
  vehicle_id uuid,
  template_id uuid,
  status text default 'active',
  custom_time_interval_days integer default null,
  custom_odometer_interval_km integer default null,
  custom_due_soon_days integer default null,
  custom_due_soon_km integer default null,
  notes text default null
)
returns uuid
language plpgsql
as $$
declare
  vehicle record;
  setting_id uuid;
  due_soon_days integer;
  due_soon_km integer;
begin
  select v.id, v.status, v.archived_at into vehicle
  from public.vehicles v
  where v.id = upsert_vehicle_maintenance_setting.vehicle_id and v.deleted_at is null;

  if vehicle.id is null then
    raise exception 'Vehicle was not found.';
  end if;

  if vehicle.status = 'archived' or vehicle.archived_at is not null then
    raise exception 'Archived vehicles cannot receive new maintenance reminders.';
  end if;

  if not exists (select 1 from public.maintenance_templates t
                 where t.id = upsert_vehicle_maintenance_setting.template_id
                   and t.deleted_at is null) then
    raise exception 'Maintenance item was not found.';
  end if;

  -- A reminder that is switched on but has neither interval would never
  -- become due, which is a quieter kind of broken than an error.
  if status in ('active', 'manually_added')
     and custom_time_interval_days is null
     and custom_odometer_interval_km is null then
    raise exception
      'Set at least one reminder interval, such as every 90 days or every 5,000 km.';
  end if;

  due_soon_days := coalesce(custom_due_soon_days, public.setting_int('default_due_soon_days', 14));
  due_soon_km := coalesce(custom_due_soon_km, public.setting_int('default_due_soon_km', 500));

  -- Update-then-insert rather than ON CONFLICT: the conflict target would
  -- name columns that collide with this function's parameters, and Postgres
  -- cannot tell which is meant.
  select s.id into setting_id
  from public.vehicle_maintenance_settings s
  where s.vehicle_id = upsert_vehicle_maintenance_setting.vehicle_id
    and s.template_id = upsert_vehicle_maintenance_setting.template_id
  limit 1;

  if setting_id is not null then
    update public.vehicle_maintenance_settings s
    set status = upsert_vehicle_maintenance_setting.status,
        custom_time_interval_days =
          upsert_vehicle_maintenance_setting.custom_time_interval_days,
        custom_odometer_interval_km =
          upsert_vehicle_maintenance_setting.custom_odometer_interval_km,
        custom_due_soon_days = due_soon_days,
        custom_due_soon_km = due_soon_km,
        notes = upsert_vehicle_maintenance_setting.notes,
        -- Re-adding a reminder somebody removed brings it back rather than
        -- refusing because a deleted row is in the way.
        deleted_at = null
    where s.id = setting_id;
  else
    insert into public.vehicle_maintenance_settings (
      vehicle_id, template_id, status,
      custom_time_interval_days, custom_odometer_interval_km,
      custom_due_soon_days, custom_due_soon_km, notes
    ) values (
      upsert_vehicle_maintenance_setting.vehicle_id,
      upsert_vehicle_maintenance_setting.template_id,
      upsert_vehicle_maintenance_setting.status,
      upsert_vehicle_maintenance_setting.custom_time_interval_days,
      upsert_vehicle_maintenance_setting.custom_odometer_interval_km,
      due_soon_days, due_soon_km, upsert_vehicle_maintenance_setting.notes
    )
    returning id into setting_id;
  end if;

  perform public.recalculate_schedule_for_setting(setting_id);

  return setting_id;
end;
$$;

create or replace function public.archive_vehicle_maintenance_setting(setting_id uuid)
returns void
language plpgsql
as $$
declare
  schedule record;
begin
  if not exists (select 1 from public.vehicle_maintenance_settings s
                 where s.id = archive_vehicle_maintenance_setting.setting_id) then
    raise exception 'Maintenance reminder was not found.';
  end if;

  update public.vehicle_maintenance_settings
  set status = 'disabled', deleted_at = now()
  where id = archive_vehicle_maintenance_setting.setting_id;

  for schedule in
    select id from public.maintenance_schedules
    where vehicle_maintenance_setting_id = archive_vehicle_maintenance_setting.setting_id
      and deleted_at is null
  loop
    perform public.resolve_stale_schedule_alerts(schedule.id, null);
  end loop;

  update public.maintenance_schedules
  set status = 'disabled', archived_at = now()
  where vehicle_maintenance_setting_id = archive_vehicle_maintenance_setting.setting_id
    and deleted_at is null;
end;
$$;

-- Brings every reminder on a vehicle back into step. The desktop app called
-- this "sync"; nothing here creates reminders on its own, because the client
-- decides which items each vehicle needs.
create or replace function public.sync_maintenance_schedules_for_vehicle(vehicle_id uuid)
returns integer
language plpgsql
as $$
declare
  setting record;
  synced integer := 0;
begin
  for setting in
    select s.id from public.vehicle_maintenance_settings s
    where s.vehicle_id = sync_maintenance_schedules_for_vehicle.vehicle_id
      and s.deleted_at is null
  loop
    perform public.recalculate_schedule_for_setting(setting.id);
    synced := synced + 1;
  end loop;

  perform public.refresh_maintenance_alerts_for_vehicle(vehicle_id);

  return synced;
end;
$$;
