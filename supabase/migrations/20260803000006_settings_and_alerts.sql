-- App settings, and the alert refresh that reads them.
--
-- Ported from src-tauri/src/settings/repository.rs and
-- src-tauri/src/maintenance/scheduling.rs:457.

-- ---------------------------------------------------------------------------
-- Settings
-- ---------------------------------------------------------------------------

insert into public.settings (key, value, value_type, description) values
  ('preferred_currency', 'PHP', 'string',
   'Preferred currency code for display only.'),
  ('distance_unit', 'km', 'string',
   'Preferred distance unit for display.'),
  ('fuel_efficiency_unit', 'km_per_liter', 'string',
   'Preferred fuel efficiency display unit.'),
  ('date_display_preference', 'yyyy_mm_dd', 'string',
   'Preferred date display style.'),
  ('default_due_soon_days', '14', 'integer',
   'Default due-soon days for newly synced maintenance schedules.'),
  ('default_due_soon_km', '500', 'integer',
   'Default due-soon odometer threshold for newly synced schedules.'),
  ('include_setup_needed_schedules', 'true', 'boolean',
   'Whether setup-needed schedules should appear in attention lists.'),
  ('backup_reminder_enabled', 'true', 'boolean',
   'Whether to show backup reminder messaging.'),
  ('backup_reminder_interval_days', '7', 'integer',
   'Days between backup reminder messages.'),
  ('maintenance_alerts_enabled', 'true', 'boolean',
   'Whether maintenance alert refresh may create new in-app alerts.'),
  ('fuel_efficiency_alerts_enabled', 'true', 'boolean',
   'Whether fuel efficiency drop checks may create new in-app alerts.'),
  ('startup_on_boot_enabled', 'false', 'boolean',
   'Startup preference for the machine the app is opened on.')
on conflict (key) do nothing;

create or replace function public.setting_bool(setting_key text, fallback boolean)
returns boolean
language sql
stable
as $$
  select coalesce(
    (select value in ('true', '1', 'yes', 'on')
     from public.settings where key = setting_key),
    fallback
  );
$$;

create or replace function public.setting_int(setting_key text, fallback integer)
returns integer
language sql
stable
as $$
  select coalesce(
    (select nullif(regexp_replace(value, '[^0-9-]', '', 'g'), '')::integer
     from public.settings where key = setting_key),
    fallback
  );
$$;

-- ---------------------------------------------------------------------------
-- Alerts
-- ---------------------------------------------------------------------------

-- Only these four are managed by the maintenance refresh. Fuel efficiency
-- raises its own alert type, and the refresh must leave it alone.
create or replace function public.maintenance_alert_types()
returns text[]
language sql
immutable
as $$
  select array[
    'due_soon_by_date', 'due_soon_by_odometer',
    'overdue_by_date', 'overdue_by_odometer'
  ];
$$;

-- Marks stale maintenance alerts for a schedule as resolved, optionally
-- sparing the one type that is still current.
create or replace function public.resolve_stale_schedule_alerts(
  schedule_id uuid,
  keep_alert_type text default null
)
returns integer
language sql
as $$
  with resolved as (
    update public.alerts a
    set status = 'resolved', resolved_at = now()
    where a.maintenance_schedule_id = resolve_stale_schedule_alerts.schedule_id
      and a.status = 'active'
      and a.deleted_at is null
      and a.alert_type = any(public.maintenance_alert_types())
      and (keep_alert_type is null or a.alert_type <> keep_alert_type)
    returning 1
  )
  select count(*)::integer from resolved;
$$;

-- Raises or refreshes one alert.
--
-- The rule worth knowing: a *dismissed* alert permanently suppresses that type
-- for that schedule. Somebody who dismisses "oil change overdue" is not asked
-- again, however overdue it becomes. That is deliberate in the original and is
-- kept here — losing it would spam people with alerts they have already
-- consciously waved away.
create or replace function public.upsert_schedule_alert(
  vehicle_id uuid,
  schedule_id uuid,
  alert_type text,
  status text,
  reason text,
  template_name text,
  vehicle_name text,
  schedule_priority text,
  next_due_date date
)
returns text
language plpgsql
as $$
declare
  existing record;
  title_status text := public.alert_title_status(status);
  alert_title text;
  alert_message text;
  -- Not named `priority`: a local of that name cannot be qualified, and an
  -- unqualified one is ambiguous against the column of the same name.
  computed_priority text := public.alert_priority(schedule_priority, status);
begin
  alert_title := format('%s is %s', template_name, title_status);
  alert_message := format('%s is %s for %s. %s',
                          template_name, title_status, vehicle_name, reason);

  -- Prefer an active alert, then a dismissed one, then a resolved one, newest
  -- first within each.
  select a.id, a.status into existing
  from public.alerts a
  where a.vehicle_id = upsert_schedule_alert.vehicle_id
    and a.maintenance_schedule_id = upsert_schedule_alert.schedule_id
    and a.alert_type = upsert_schedule_alert.alert_type
    and a.deleted_at is null
  order by case a.status
             when 'active' then 0
             when 'dismissed' then 1
             when 'resolved' then 2
             else 3
           end,
           a.created_at desc
  limit 1;

  if existing.status = 'active' then
    update public.alerts
    set priority = computed_priority,
        title = alert_title,
        message = alert_message,
        due_date = upsert_schedule_alert.next_due_date,
        related_record_type = 'maintenance_schedule',
        related_record_id = upsert_schedule_alert.schedule_id
    where id = existing.id;
    return 'updated';
  end if;

  if existing.status = 'dismissed' then
    return 'suppressed';
  end if;

  insert into public.alerts (
    vehicle_id, maintenance_schedule_id, alert_type, priority,
    title, message, related_record_type, related_record_id, status, due_date
  ) values (
    upsert_schedule_alert.vehicle_id, upsert_schedule_alert.schedule_id,
    upsert_schedule_alert.alert_type, computed_priority,
    alert_title, alert_message, 'maintenance_schedule',
    upsert_schedule_alert.schedule_id, 'active', upsert_schedule_alert.next_due_date
  );
  return 'created';
end;
$$;

-- ---------------------------------------------------------------------------
-- The refresh itself
-- ---------------------------------------------------------------------------

-- Guarded so that re-applying this file is a no-op, which every other
-- statement in it already is.
do $do$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'alert_refresh_result'
  ) then
    create type public.alert_refresh_result as (
    vehicle_id uuid,
    created_count integer,
    updated_count integer,
    resolved_count integer
    );
  end if;
end $do$;

create or replace function public.refresh_maintenance_alerts_for_vehicle(
  vehicle_id uuid,
  today date default current_date
)
returns public.alert_refresh_result
language plpgsql
as $$
declare
  vehicle record;
  schedule record;
  evaluation public.due_evaluation;
  outcome text;
  created_count integer := 0;
  updated_count integer := 0;
  resolved_count integer := 0;
  alerts_enabled boolean := public.setting_bool('maintenance_alerts_enabled', true);
begin
  select v.id, v.vehicle_name, v.current_odometer, v.status, v.archived_at
  into vehicle
  from public.vehicles v
  where v.id = refresh_maintenance_alerts_for_vehicle.vehicle_id
    and v.deleted_at is null;

  if vehicle.id is null then
    raise exception 'That vehicle was not found.';
  end if;

  -- Schedule statuses are refreshed whether or not alerts are switched off,
  -- so the screens stay truthful even when nobody wants to be notified.
  for schedule in
    select s.id, s.next_due_date, s.next_due_odometer, s.due_soon_days,
           s.due_soon_km, s.status, s.priority, t.name as template_name
    from public.maintenance_schedules s
    join public.maintenance_templates t on t.id = s.template_id
    where s.vehicle_id = refresh_maintenance_alerts_for_vehicle.vehicle_id
      and s.deleted_at is null
  loop
    evaluation := public.evaluate_due_status(
      today, vehicle.current_odometer, schedule.next_due_date,
      schedule.next_due_odometer, schedule.due_soon_days, schedule.due_soon_km,
      schedule.status = 'disabled'
    );

    update public.maintenance_schedules
    set status = evaluation.status
    where id = schedule.id
      and status is distinct from evaluation.status;

    if not alerts_enabled then
      continue;
    end if;

    -- An archived vehicle stops nagging: everything outstanding is resolved
    -- and nothing new is raised.
    if vehicle.status = 'archived' or vehicle.archived_at is not null then
      resolved_count := resolved_count
        + public.resolve_stale_schedule_alerts(schedule.id, null);
      continue;
    end if;

    if evaluation.alert_type is null then
      resolved_count := resolved_count
        + public.resolve_stale_schedule_alerts(schedule.id, null);
      continue;
    end if;

    outcome := public.upsert_schedule_alert(
      vehicle.id, schedule.id, evaluation.alert_type, evaluation.status,
      evaluation.reason, schedule.template_name, vehicle.vehicle_name,
      schedule.priority, schedule.next_due_date
    );

    if outcome = 'created' then
      created_count := created_count + 1;
    elsif outcome = 'updated' then
      updated_count := updated_count + 1;
    end if;

    -- Anything raised for a different reason is no longer the current story.
    resolved_count := resolved_count
      + public.resolve_stale_schedule_alerts(schedule.id, evaluation.alert_type);
  end loop;

  return row(vehicle.id, created_count, updated_count, resolved_count)
    ::public.alert_refresh_result;
end;
$$;

-- The desktop app refreshed one vehicle at a time and the web app fanned out
-- over every vehicle, which is one request per vehicle plus two. Over a
-- network that is the difference between instant and sluggish, so the fan-out
-- moves here.
create or replace function public.refresh_maintenance_alerts_for_all_vehicles(
  today date default current_date
)
returns public.alert_refresh_result
language plpgsql
as $$
declare
  vehicle record;
  one public.alert_refresh_result;
  created_count integer := 0;
  updated_count integer := 0;
  resolved_count integer := 0;
begin
  for vehicle in
    select id from public.vehicles where deleted_at is null
  loop
    one := public.refresh_maintenance_alerts_for_vehicle(vehicle.id, today);
    created_count := created_count + one.created_count;
    updated_count := updated_count + one.updated_count;
    resolved_count := resolved_count + one.resolved_count;
  end loop;

  return row(null::uuid, created_count, updated_count, resolved_count)
    ::public.alert_refresh_result;
end;
$$;

create or replace function public.dismiss_alert(alert_id uuid)
returns void
language plpgsql
as $$
declare
  affected integer;
begin
  update public.alerts
  set status = 'dismissed', resolved_at = now()
  where id = dismiss_alert.alert_id
    and status = 'active'
    and deleted_at is null;

  get diagnostics affected = row_count;

  if affected = 0 then
    raise exception 'Alert was not found or is already inactive.';
  end if;
end;
$$;
