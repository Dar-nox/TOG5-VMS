-- Soft deletes that reach the children, and the dashboard read model.

-- ---------------------------------------------------------------------------
-- Soft delete
--
-- ON DELETE CASCADE only fires on a real delete, and this app archives instead.
-- The desktop code fanned out to the child tables by hand after every soft
-- delete. A client talking straight to PostgREST would not, and would leave
-- orphaned rows visible — a trip that is gone with its drivers still listed.
-- Triggers make it impossible to forget.
-- ---------------------------------------------------------------------------

create or replace function public.cascade_trip_soft_delete()
returns trigger
language plpgsql
as $$
begin
  if new.deleted_at is not null and old.deleted_at is null then
    update public.trip_drivers set deleted_at = new.deleted_at
      where trip_id = new.id and deleted_at is null;
    update public.trip_passengers set deleted_at = new.deleted_at
      where trip_id = new.id and deleted_at is null;
    update public.trip_destinations set deleted_at = new.deleted_at
      where trip_id = new.id and deleted_at is null;
  elsif new.deleted_at is null and old.deleted_at is not null then
    -- Restoring a trip brings its people back with it.
    update public.trip_drivers set deleted_at = null
      where trip_id = new.id and deleted_at = old.deleted_at;
    update public.trip_passengers set deleted_at = null
      where trip_id = new.id and deleted_at = old.deleted_at;
    update public.trip_destinations set deleted_at = null
      where trip_id = new.id and deleted_at = old.deleted_at;
  end if;

  return null;
end;
$$;

create trigger cascade_soft_delete
  after update of deleted_at on public.trips
  for each row
  when (old.deleted_at is distinct from new.deleted_at)
  execute function public.cascade_trip_soft_delete();

-- Archiving a vehicle takes its reminders and alerts out of circulation, but
-- leaves the history that references it alone.
create or replace function public.cascade_vehicle_soft_delete()
returns trigger
language plpgsql
as $$
begin
  if new.deleted_at is not null and old.deleted_at is null then
    update public.maintenance_schedules
      set deleted_at = new.deleted_at
      where vehicle_id = new.id and deleted_at is null;
    update public.vehicle_maintenance_settings
      set deleted_at = new.deleted_at
      where vehicle_id = new.id and deleted_at is null;
    update public.alerts
      set status = 'resolved', resolved_at = now()
      where vehicle_id = new.id and status = 'active' and deleted_at is null;
  end if;

  return null;
end;
$$;

create trigger cascade_soft_delete
  after update of deleted_at on public.vehicles
  for each row
  when (old.deleted_at is null and new.deleted_at is not null)
  execute function public.cascade_vehicle_soft_delete();

-- ---------------------------------------------------------------------------
-- Dashboard
--
-- One call rather than the eight the desktop app assembled separately. Over
-- local IPC that was free; over a network it is eight round trips before
-- anybody sees a number.
-- ---------------------------------------------------------------------------

create or replace function public.dashboard_overview()
returns jsonb
language sql
stable
as $$
  with vehicle_counts as (
    select
      count(*) filter (where status <> 'archived' and archived_at is null) as active_count,
      count(*) filter (where status = 'archived' or archived_at is not null) as archived_count,
      count(*) as total_count
    from public.vehicles
    where deleted_at is null
  ),
  schedule_counts as (
    select
      count(*) filter (where status = 'overdue') as overdue_count,
      count(*) filter (where status = 'due_today') as due_today_count,
      count(*) filter (where status = 'due_soon') as due_soon_count,
      count(*) filter (where status = 'needs_setup') as needs_setup_count
    from public.maintenance_schedules
    where deleted_at is null and archived_at is null
  ),
  upcoming as (
    select coalesce(jsonb_agg(item order by item->>'rank', item->>'templateName'), '[]'::jsonb) as items
    from (
      select jsonb_build_object(
               'scheduleId', s.id,
               'vehicleId', s.vehicle_id,
               'vehicleName', v.vehicle_name,
               'templateName', t.name,
               'status', s.status,
               'priority', s.priority,
               'nextDueDate', s.next_due_date,
               'nextDueOdometer', s.next_due_odometer,
               'rank', case s.status
                         when 'overdue' then '0'
                         when 'due_today' then '1'
                         when 'due_soon' then '2'
                         when 'needs_setup' then '3'
                         else '4' end
             ) as item
      from public.maintenance_schedules s
      join public.vehicles v on v.id = s.vehicle_id
      join public.maintenance_templates t on t.id = s.template_id
      where s.deleted_at is null and s.archived_at is null
        and s.status in ('overdue', 'due_today', 'due_soon', 'needs_setup')
        and v.deleted_at is null
      order by case s.status
                 when 'overdue' then 0 when 'due_today' then 1
                 when 'due_soon' then 2 else 3 end,
               case s.priority
                 when 'critical' then 0 when 'high' then 1
                 when 'medium' then 2 else 3 end,
               t.name
      limit 5
    ) ranked
  ),
  alert_counts as (
    select
      count(*) as active_count,
      count(*) filter (where priority = 'critical') as critical_count
    from public.alerts
    where status = 'active' and deleted_at is null
  ),
  month_costs as (
    select
      coalesce(sum(amount) filter (where source_type = 'fuel'), 0) as fuel,
      coalesce(sum(amount) filter (where source_type = 'maintenance'), 0) as maintenance,
      coalesce(sum(amount) filter (where source_type = 'repair'), 0) as repair,
      coalesce(sum(amount) filter (where source_type = 'expense'), 0) as expense,
      coalesce(sum(amount), 0) as total
    from public.cost_events
    where event_date >= date_trunc('month', current_date)::date
      and event_date < (date_trunc('month', current_date) + interval '1 month')::date
  ),
  recent as (
    select coalesce(jsonb_agg(jsonb_build_object(
             'sourceType', source_type,
             'sourceId', source_id,
             'vehicleName', vehicle_name,
             'eventDate', event_date,
             'description', description,
             'amount', amount
           ) order by event_date desc, source_id desc), '[]'::jsonb) as items
    from (select * from public.cost_events order by event_date desc, source_id desc limit 8) c
  ),
  fuel_summary as (
    select
      count(*) as official_count,
      round(avg(computed_km_per_liter), 2) as average_km_per_liter
    from public.fuel_logs
    where deleted_at is null and efficiency_status = 'official'
  )
  select jsonb_build_object(
    'vehicleSummary', jsonb_build_object(
      'activeCount', (select active_count from vehicle_counts),
      'archivedCount', (select archived_count from vehicle_counts),
      'totalCount', (select total_count from vehicle_counts)
    ),
    'maintenanceSummary', jsonb_build_object(
      'overdueCount', (select overdue_count from schedule_counts),
      'dueTodayCount', (select due_today_count from schedule_counts),
      'dueSoonCount', (select due_soon_count from schedule_counts),
      'needsSetupCount', (select needs_setup_count from schedule_counts),
      'upcoming', (select items from upcoming)
    ),
    'alertSummary', jsonb_build_object(
      'activeCount', (select active_count from alert_counts),
      'criticalCount', (select critical_count from alert_counts)
    ),
    'costSummary', jsonb_build_object(
      'fuelTotal', (select fuel from month_costs),
      'maintenanceTotal', (select maintenance from month_costs),
      'repairTotal', (select repair from month_costs),
      'expenseTotal', (select expense from month_costs),
      'monthTotal', (select total from month_costs)
    ),
    'fuelSummary', jsonb_build_object(
      'officialLogCount', (select official_count from fuel_summary),
      'averageKmPerLiter', (select average_km_per_liter from fuel_summary)
    ),
    'recentActivity', (select items from recent),
    'currency', (select value from public.settings where key = 'preferred_currency')
  );
$$;
