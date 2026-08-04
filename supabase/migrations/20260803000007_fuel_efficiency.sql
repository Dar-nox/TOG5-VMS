-- Fuel efficiency.
--
-- Ported from src-tauri/src/fuel/repository.rs:381. The desktop app recomputed
-- a vehicle's entire fuel history after every write, walking the logs in order
-- and carrying a checkpoint. That is a window function here, which is both
-- shorter and considerably faster, but the rules are reproduced exactly.
--
-- A reading is "official" only when all of these hold:
--   * the tank was filled
--   * the fuel is not DEF/AdBlue, which is an additive rather than fuel
--   * there is an earlier qualifying full tank to measure from
--   * the distance since it is positive, and litres are positive
--
-- The subtle one: the checkpoint advances on *any* non-DEF full tank, even one
-- that produced no official reading. So the distance is always between
-- consecutive full tanks, never from the last official reading. Getting that
-- wrong inflates efficiency after any gap.

create or replace function public.recalculate_fuel_efficiency(vehicle_id uuid)
returns void
language sql
as $$
  with ordered as (
    select
      f.id,
      f.odometer,
      f.fuel_date,
      f.created_at,
      f.liters,
      f.total_amount,
      f.is_full_tank and f.fuel_type <> 'def_adblue' as is_checkpoint
    from public.fuel_logs f
    where f.vehicle_id = recalculate_fuel_efficiency.vehicle_id
      and f.deleted_at is null
  ),
  with_previous as (
    select
      o.*,
      -- The last full tank before this row. Postgres has no IGNORE NULLS on
      -- lag(), but because the rows are ordered by odometer ascending, the
      -- largest checkpoint odometer among the preceding rows *is* the previous
      -- checkpoint.
      max(case when o.is_checkpoint then o.odometer end) over (
        order by o.odometer asc, o.fuel_date asc, o.created_at asc
        rows between unbounded preceding and 1 preceding
      ) as previous_odometer
    from ordered o
  ),
  computed as (
    select
      w.id,
      case
        when w.is_checkpoint
         and w.previous_odometer is not null
         and w.odometer - w.previous_odometer > 0
         and w.liters > 0
        then 'official'
        else 'not_computed'
      end as efficiency_status,
      case
        when w.is_checkpoint
         and w.previous_odometer is not null
         and w.odometer - w.previous_odometer > 0
         and w.liters > 0
        then (w.odometer - w.previous_odometer) / w.liters
      end as km_per_liter,
      case
        when w.is_checkpoint
         and w.previous_odometer is not null
         and w.odometer - w.previous_odometer > 0
         and w.liters > 0
        then (w.liters / (w.odometer - w.previous_odometer)) * 100
      end as l_per_100km,
      case
        when w.is_checkpoint
         and w.previous_odometer is not null
         and w.odometer - w.previous_odometer > 0
         and w.liters > 0
        then w.total_amount / (w.odometer - w.previous_odometer)
      end as cost_per_km
    from with_previous w
  )
  update public.fuel_logs f
  set efficiency_status = c.efficiency_status,
      computed_km_per_liter = c.km_per_liter,
      computed_l_per_100km = c.l_per_100km,
      computed_cost_per_km = c.cost_per_km
  from computed c
  where f.id = c.id
    and (f.efficiency_status is distinct from c.efficiency_status
      or f.computed_km_per_liter is distinct from c.km_per_liter
      or f.computed_l_per_100km is distinct from c.l_per_100km
      or f.computed_cost_per_km is distinct from c.cost_per_km);
$$;

-- ---------------------------------------------------------------------------
-- The summary, and the drop warning
-- ---------------------------------------------------------------------------

-- Guarded so that re-applying this file is a no-op, which every other
-- statement in it already is.
do $do$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'fuel_efficiency_summary'
  ) then
    create type public.fuel_efficiency_summary as (
    vehicle_id uuid,
    official_log_count integer,
    latest_km_per_liter numeric,
    recent_average_km_per_liter numeric,
    efficiency_drop_detected boolean,
    warning text
    );
  end if;
end $do$;

create or replace function public.fuel_efficiency_summary_for_vehicle(vehicle_id uuid)
returns public.fuel_efficiency_summary
language plpgsql
stable
as $$
declare
  readings numeric[];
  total integer;
  latest numeric;
  average numeric;
  dropped boolean := false;
  warning text;
begin
  select array_agg(f.computed_km_per_liter order by f.fuel_date desc, f.odometer desc,
                   f.created_at desc)
  into readings
  from public.fuel_logs f
  where f.vehicle_id = fuel_efficiency_summary_for_vehicle.vehicle_id
    and f.deleted_at is null
    and f.efficiency_status = 'official'
    and f.computed_km_per_liter is not null;

  readings := coalesce(readings, array[]::numeric[]);
  total := cardinality(readings);
  latest := case when total > 0 then readings[1] end;

  -- The average of exactly the three readings before the latest, and only once
  -- there are four to compare. Fewer than that is too little history to call a
  -- drop.
  if total >= 4 then
    average := (readings[2] + readings[3] + readings[4]) / 3;
  end if;

  if latest is not null and average is not null then
    dropped := latest < average * 0.8;
  end if;

  if dropped then
    warning := 'Latest official fuel efficiency is more than 20% below the recent average.';
  elsif total < 2 then
    warning := 'Add at least two full-tank fuel logs to calculate official fuel efficiency.';
  end if;

  return row(fuel_efficiency_summary_for_vehicle.vehicle_id, total, latest, average,
             dropped, warning)::public.fuel_efficiency_summary;
end;
$$;

-- Unlike maintenance alerts, this one has no dismissal memory: it is raised
-- while the condition holds and resolved when it clears.
create or replace function public.refresh_fuel_efficiency_alert(vehicle_id uuid)
returns void
language plpgsql
as $$
declare
  summary public.fuel_efficiency_summary;
  vehicle_name text;
  existing_id uuid;
begin
  if not public.setting_bool('fuel_efficiency_alerts_enabled', true) then
    return;
  end if;

  select v.vehicle_name into vehicle_name
  from public.vehicles v
  where v.id = refresh_fuel_efficiency_alert.vehicle_id and v.deleted_at is null;

  if vehicle_name is null then
    return;
  end if;

  summary := public.fuel_efficiency_summary_for_vehicle(vehicle_id);

  select a.id into existing_id
  from public.alerts a
  where a.vehicle_id = refresh_fuel_efficiency_alert.vehicle_id
    and a.alert_type = 'fuel_efficiency_drop'
    and a.status = 'active'
    and a.deleted_at is null
  limit 1;

  if summary.efficiency_drop_detected then
    if existing_id is null then
      insert into public.alerts
        (vehicle_id, alert_type, priority, title, message, status)
      values (
        refresh_fuel_efficiency_alert.vehicle_id, 'fuel_efficiency_drop', 'medium',
        format('%s fuel efficiency dropped', vehicle_name),
        format('%s is averaging %s km/L against a recent average of %s km/L.',
               vehicle_name,
               to_char(summary.latest_km_per_liter, 'FM999999990.00'),
               to_char(summary.recent_average_km_per_liter, 'FM999999990.00')),
        'active'
      );
    end if;
  elsif existing_id is not null then
    update public.alerts
    set status = 'resolved', resolved_at = now()
    where id = existing_id;
  end if;
end;
$$;

-- Any change to a vehicle's fuel logs re-derives the whole history for that
-- vehicle. The desktop app did this in application code after every write;
-- doing it in a trigger means a client cannot forget to.
create or replace function public.on_fuel_log_changed()
returns trigger
language plpgsql
as $$
declare
  affected_vehicle uuid := coalesce(new.vehicle_id, old.vehicle_id);
begin
  perform public.recalculate_fuel_efficiency(affected_vehicle);
  perform public.refresh_fuel_efficiency_alert(affected_vehicle);
  return null;
end;
$$;

create trigger recalculate_fuel_efficiency_on_write
  after insert or delete on public.fuel_logs
  for each row execute function public.on_fuel_log_changed();

-- Only when something the calculation reads has actually changed. Without this
-- condition the recalculation's own writes re-fire the trigger, which recurses
-- until Postgres runs out of stack.
create trigger recalculate_fuel_efficiency_on_change
  after update on public.fuel_logs
  for each row
  when (
    old.vehicle_id is distinct from new.vehicle_id
    or old.odometer is distinct from new.odometer
    or old.fuel_date is distinct from new.fuel_date
    or old.liters is distinct from new.liters
    or old.total_amount is distinct from new.total_amount
    or old.is_full_tank is distinct from new.is_full_tank
    or old.fuel_type is distinct from new.fuel_type
    or old.deleted_at is distinct from new.deleted_at
  )
  execute function public.on_fuel_log_changed();
