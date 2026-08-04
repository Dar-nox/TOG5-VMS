-- The dashboard.
--
-- A faithful port of src-tauri/src/dashboard/repository.rs — eight summaries
-- the desktop app assembled from eight separate queries. It is the first
-- screen anybody opens, so a half-populated one reads as broken rather than
-- unfinished, and it is worth doing properly.
--
-- Returned as one jsonb document in the shape the screen already expects,
-- because eight round trips before anybody sees a number is the difference
-- between instant and sluggish over a phone connection.

drop function if exists public.dashboard_overview();

create or replace function public.dashboard_overview()
returns jsonb
language plpgsql
stable
as $$
declare
  currency text := coalesce(
    (select value from public.settings where key = 'preferred_currency'), 'PHP');
  owner_name text := coalesce(
    (select display_name from public.profiles
     where role = 'owner' and deleted_at is null
     order by created_at limit 1),
    'Fleet Owner');
  month_start date := date_trunc('month', current_date)::date;
  month_end date := (date_trunc('month', current_date) + interval '1 month')::date;
  vehicles jsonb;
  maintenance jsonb;
  alerts jsonb;
  fuel jsonb;
  costs jsonb;
  backup jsonb;
  activity jsonb;
  hints jsonb;
  overdue_count integer;
  needs_setup_count integer;
  vehicle_count integer;
  official_count integer;
  latest_efficiency numeric;
  average_efficiency numeric;
  drop_active boolean;
begin
  -- ------------------------------------------------------------------
  -- Vehicles
  -- ------------------------------------------------------------------
  select jsonb_build_object(
           'totalCount', count(*),
           'activeCount', count(*) filter (where status = 'active'),
           'archivedCount', count(*) filter (where status = 'archived'),
           'underMaintenanceCount', count(*) filter (where status = 'under_maintenance'),
           'latestVehicleName', (select v.vehicle_name from public.vehicles v
                                 where v.deleted_at is null
                                 order by v.created_at desc limit 1),
           'latestVehiclePhotoPath', (select p.storage_path
                                      from public.vehicles v
                                      left join public.vehicle_photos p
                                        on p.id = v.primary_photo_id and p.deleted_at is null
                                      where v.deleted_at is null
                                      order by v.created_at desc limit 1)
         ),
         count(*) filter (where status <> 'archived')
  into vehicles, vehicle_count
  from public.vehicles
  where deleted_at is null;

  -- ------------------------------------------------------------------
  -- Maintenance
  --
  -- Ordered the way somebody triages: overdue first, then by how much it
  -- matters, then alphabetically so the list does not shuffle between loads.
  -- ------------------------------------------------------------------
  select jsonb_build_object(
           'totalScheduleCount', count(*),
           'overdueCount', count(*) filter (where s.status = 'overdue'),
           'dueTodayCount', count(*) filter (where s.status = 'due_today'),
           'dueSoonCount', count(*) filter (where s.status = 'due_soon'),
           'needsSetupCount', count(*) filter (where s.status = 'needs_setup'),
           'upcoming', coalesce((
             select jsonb_agg(item)
             from (
               select jsonb_build_object(
                        'id', d.id,
                        'vehicleId', d.vehicle_id,
                        'vehicleName', d.vehicle_name,
                        'templateName', d.template_name,
                        'category', d.category,
                        'priority', d.priority,
                        'dueStatus', d.status,
                        'dueReason', (public.evaluate_due_status(
                          current_date, v.current_odometer, d.next_due_date,
                          d.next_due_odometer, d.due_soon_days, d.due_soon_km,
                          d.status = 'disabled')).reason,
                        'nextDueDate', d.next_due_date,
                        'nextDueOdometer', d.next_due_odometer
                      ) as item
               from public.maintenance_schedules_detailed d
               join public.vehicles v on v.id = d.vehicle_id
               where d.archived_at is null
                 and d.status in ('overdue', 'due_today', 'due_soon', 'needs_setup')
               order by case d.status
                          when 'overdue' then 0 when 'due_today' then 1
                          when 'due_soon' then 2 else 3 end,
                        case d.priority
                          when 'critical' then 0 when 'high' then 1
                          when 'medium' then 2 else 3 end,
                        d.template_name
               limit 5
             ) ranked
           ), '[]'::jsonb)
         ),
         count(*) filter (where s.status = 'overdue'),
         count(*) filter (where s.status = 'needs_setup')
  into maintenance, overdue_count, needs_setup_count
  from public.maintenance_schedules s
  where s.deleted_at is null and s.archived_at is null;

  -- ------------------------------------------------------------------
  -- Alerts
  -- ------------------------------------------------------------------
  select jsonb_build_object(
           'activeCount', count(*),
           'highPriorityCount', count(*) filter (where priority in ('critical', 'high')),
           'topAlerts', coalesce((
             select jsonb_agg(item)
             from (
               select jsonb_build_object(
                        'id', a.id,
                        'title', a.title,
                        'message', a.message,
                        'alertType', a.alert_type,
                        'priority', a.priority,
                        'maintenanceScheduleId', a.maintenance_schedule_id,
                        'vehicleName', a.vehicle_name,
                        'maintenanceTemplateName', a.template_name,
                        'createdAt', a.created_at,
                        'dueDate', a.due_date
                      ) as item
               from public.alerts_detailed a
               where a.status = 'active'
               order by case a.priority
                          when 'critical' then 0 when 'high' then 1
                          when 'medium' then 2 else 3 end,
                        a.created_at desc
               limit 5
             ) top
           ), '[]'::jsonb)
         )
  into alerts
  from public.alerts
  where status = 'active' and deleted_at is null;

  -- ------------------------------------------------------------------
  -- Fuel
  --
  -- The dashboard panel and the per-vehicle summary differ deliberately, and
  -- both are reproduced as they were. This one averages the three most recent
  -- official readings across the whole fleet, and takes "efficiency dropped"
  -- from whether an alert is actually raised rather than recomputing it.
  -- ------------------------------------------------------------------
  select count(*), (array_agg(computed_km_per_liter order by rn))[1],
         round(avg(computed_km_per_liter), 2)
  into official_count, latest_efficiency, average_efficiency
  from (
    select f.computed_km_per_liter,
           row_number() over (order by f.fuel_date desc, f.created_at desc) as rn
    from public.fuel_logs f
    where f.deleted_at is null and f.efficiency_status = 'official'
      and f.computed_km_per_liter is not null
    order by f.fuel_date desc, f.created_at desc
    limit 3
  ) recent;

  select exists (
    select 1 from public.alerts
    where deleted_at is null and status = 'active' and alert_type = 'fuel_efficiency_drop'
  ) into drop_active;

  fuel := jsonb_build_object(
    'latestOfficialKmPerLiter', round(latest_efficiency, 2),
    'recentAverageKmPerLiter', average_efficiency,
    'officialLogCount', official_count,
    'efficiencyDropActive', drop_active,
    'message', case official_count
      when 0 then 'Not enough full-tank fuel logs yet.'
      when 1 then 'One official full-tank efficiency result is available.'
      else 'Recent official full-tank efficiency is ready.'
    end
  );

  -- ------------------------------------------------------------------
  -- Costs this month
  --
  -- Reads from cost_events, which already excludes expenses that mirror a
  -- fuel log or a service record.
  -- ------------------------------------------------------------------
  select jsonb_build_object(
           'currentMonth', to_char(current_date, 'YYYY-MM'),
           'totalTrackedCost', coalesce(sum(amount), 0),
           'fuelTotal', coalesce(sum(amount) filter (where source_type = 'fuel_log'), 0),
           'maintenanceTotal', coalesce(sum(amount) filter (where source_type = 'maintenance_log'), 0),
           'repairTotal', coalesce(sum(amount) filter (where source_type = 'repair_record'), 0),
           'manualExpenseTotal', coalesce(sum(amount) filter (where source_type = 'expense'), 0),
           'preferredCurrency', currency
         )
  into costs
  from public.cost_events
  where event_date >= month_start and event_date < month_end;

  -- ------------------------------------------------------------------
  -- Exports
  --
  -- An earlier version of this panel said backups ran automatically on the
  -- server and there was nothing to do. That was wrong, and wrong in the worst
  -- direction: the plan this runs on takes no automatic copies at all. A
  -- reassuring message is exactly what stops somebody taking the export that
  -- would have saved them, so the panel now counts from the last real one.
  -- ------------------------------------------------------------------
  backup := (
    select jsonb_build_object(
      'latestCompletedAt', status -> 'latestBackupCompletedAt',
      'latestBackupPath', null,
      'reminderDue', (status ->> 'reminderDue')::boolean,
      'message', status ->> 'message',
      'packageNote', 'Take an export from the Backup screen. Nothing else keeps a copy.'
    )
    from public.backup_reminder_status() as status
  );

  -- ------------------------------------------------------------------
  -- Recent activity
  -- ------------------------------------------------------------------
  select coalesce(jsonb_agg(item order by happened_at desc), '[]'::jsonb)
  into activity
  from (
    select jsonb_build_object(
             'id', c.source_id,
             'activityType', c.source_type,
             'title', initcap(replace(c.source_type, '_', ' ')),
             'detail', c.description,
             'happenedAt', c.event_date,
             'vehicleName', c.vehicle_name,
             'amount', c.amount,
             'targetPage', case c.source_type
                             when 'fuel_log' then 'fuel'
                             when 'maintenance_log' then 'service-history'
                             when 'repair_record' then 'service-history'
                             else 'expenses' end
           ) as item,
           c.event_date as happened_at
    from public.cost_events c
    order by c.event_date desc, c.source_id desc
    limit 8
  ) recent;

  -- ------------------------------------------------------------------
  -- Setup hints
  --
  -- Onboarding nudges, in the order somebody would sensibly act on them.
  -- ------------------------------------------------------------------
  select coalesce(jsonb_agg(hint), '[]'::jsonb)
  into hints
  from (
    select jsonb_build_object(
             'code', 'add_first_vehicle',
             'title', 'Add your first vehicle',
             'message', 'Vehicles are the starting point for fuel, trips and maintenance.',
             'actionLabel', 'Add vehicle', 'targetPage', 'vehicles') as hint
    where vehicle_count = 0
    union all
    select jsonb_build_object(
             'code', 'set_up_reminders',
             'title', 'Set up maintenance reminders',
             'message', 'Choose which maintenance each vehicle needs and how often.',
             'actionLabel', 'Open maintenance', 'targetPage', 'maintenance')
    where vehicle_count > 0
      and not exists (select 1 from public.vehicle_maintenance_settings
                      where deleted_at is null)
    union all
    select jsonb_build_object(
             'code', 'finish_reminder_setup',
             'title', 'Some reminders need intervals',
             'message', 'A few maintenance items have no schedule set, so they will never come due.',
             'actionLabel', 'Review reminders', 'targetPage', 'maintenance')
    where needs_setup_count > 0
    union all
    select jsonb_build_object(
             'code', 'overdue_work',
             'title', 'Maintenance is overdue',
             'message', 'Some work is past due. Log it once it has been done.',
             'actionLabel', 'Open maintenance', 'targetPage', 'maintenance')
    where overdue_count > 0
    union all
    select jsonb_build_object(
             'code', 'add_fuel_logs',
             'title', 'Record fuel to track efficiency',
             'message', 'Two full-tank fuel logs are enough to start calculating km per litre.',
             'actionLabel', 'Open fuel logs', 'targetPage', 'fuel')
    where vehicle_count > 0 and official_count < 2
  ) all_hints;

  return jsonb_build_object(
    'generatedAt', now(),
    'ownerDisplayName', owner_name,
    'preferredCurrency', currency,
    'vehicleSummary', vehicles,
    'maintenanceSummary', maintenance,
    'alertsSummary', alerts,
    'fuelSummary', fuel,
    'costSummary', costs,
    'backupSummary', backup,
    'recentActivity', activity,
    'setupHints', hints
  );
end;
$$;
