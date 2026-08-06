-- A trip carries its readings and its costs.
--
-- Two gaps the client found in daily use.
--
-- The odometer never moved when a vehicle went out and came back, only when
-- fuel or service was recorded. A van could run for weeks between fill-ups with
-- the app believing it had not travelled a kilometre, which is the same failure
-- 20260803000022 fixed for fuel: distance-based maintenance never comes due.
--
-- And money spent on a trip was recorded somewhere else entirely, so "what did
-- the Batangas run cost" had no answer. Fuel and expenses now point at the trip
-- they belong to. Both links are optional: a yard top-up has no trip, and the
-- Fuel tab still records one on its own.

-- ---------------------------------------------------------------------------
-- Readings
-- ---------------------------------------------------------------------------

alter table public.trips
  add column if not exists departure_odometer numeric(12, 2)
    check (departure_odometer is null or departure_odometer >= 0),
  add column if not exists return_odometer numeric(12, 2)
    check (return_odometer is null or return_odometer >= 0);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'trips_return_odometer_after_departure'
  ) then
    -- The same shape as trips_return_after_departure, for the same reason: a
    -- trip that came back on a lower reading than it left on is a typo, not a
    -- journey.
    alter table public.trips
      add constraint trips_return_odometer_after_departure
      check (return_odometer is null
             or departure_odometer is null
             or return_odometer >= departure_odometer);
  end if;
end $$;

comment on column public.trips.departure_odometer is
  'Reading when the vehicle left. Filled from the vehicle unless somebody types otherwise.';
comment on column public.trips.return_odometer is
  'Reading when it came back. This is the one that moves the vehicle, and only ever forward.';

-- ---------------------------------------------------------------------------
-- Money spent on a trip
-- ---------------------------------------------------------------------------
--
-- `on delete set null`, deliberately, where trip_drivers and its siblings
-- cascade. A driver only exists as part of the trip; a receipt is a financial
-- record of its own, and archiving the trip it happened on must not take it —
-- the money was still spent, and the cost reports still have to add up.

alter table public.fuel_logs
  add column if not exists trip_id uuid references public.trips(id) on delete set null;

alter table public.expenses
  add column if not exists trip_id uuid references public.trips(id) on delete set null;

create index if not exists fuel_logs_trip_idx on public.fuel_logs(trip_id)
  where trip_id is not null;
create index if not exists expenses_trip_idx on public.expenses(trip_id)
  where trip_id is not null;

-- ---------------------------------------------------------------------------
-- Starting and closing
-- ---------------------------------------------------------------------------

-- Dropped rather than replaced: adding a parameter makes a second function
-- with a different signature rather than replacing the first, and PostgREST
-- then has two candidates for the same call.
drop function if exists public.start_trip(uuid, timestamptz, text, text[], text[], text[], text);

create or replace function public.start_trip(
  vehicle_id uuid,
  departure_time timestamptz,
  reason text,
  drivers text[] default array[]::text[],
  passengers text[] default array[]::text[],
  destinations text[] default array[]::text[],
  departure_notes text default null,
  departure_odometer numeric default null
)
returns uuid
language plpgsql
as $$
declare
  vehicle record;
  new_trip uuid;
begin
  select v.id, v.current_odometer into vehicle
  from public.vehicles v
  where v.id = start_trip.vehicle_id and v.deleted_at is null;

  if vehicle.id is null then
    raise exception 'Vehicle was not found.';
  end if;

  if coalesce(array_length(drivers, 1), 0) = 0 then
    raise exception 'Add at least one driver before starting the trip.';
  end if;

  if coalesce(array_length(destinations, 1), 0) = 0 then
    raise exception 'Add at least one destination before starting the trip.';
  end if;

  -- One open trip per vehicle. The unique index enforces it too, but catching
  -- it here means a sentence rather than a constraint name.
  if exists (select 1 from public.trips t
             where t.vehicle_id = start_trip.vehicle_id
               and t.status = 'open' and t.deleted_at is null) then
    raise exception 'That vehicle is already out on a trip.';
  end if;

  insert into public.trips (vehicle_id, departure_time, reason, departure_notes,
                            departure_odometer, status, created_by, updated_by)
  values (start_trip.vehicle_id, start_trip.departure_time, start_trip.reason,
          start_trip.departure_notes,
          -- Nobody should have to walk to the vehicle to read a number the app
          -- already knows.
          coalesce(start_trip.departure_odometer, vehicle.current_odometer),
          'open', auth.uid(), auth.uid())
  returning id into new_trip;

  insert into public.trip_drivers (trip_id, driver_name, sort_order)
  select new_trip, name, ordinality - 1
  from unnest(drivers) with ordinality as t(name, ordinality)
  where nullif(trim(name), '') is not null;

  insert into public.trip_passengers (trip_id, passenger_name, sort_order)
  select new_trip, name, ordinality - 1
  from unnest(passengers) with ordinality as t(name, ordinality)
  where nullif(trim(name), '') is not null;

  insert into public.trip_destinations (trip_id, destination_name, sort_order)
  select new_trip, name, ordinality - 1
  from unnest(destinations) with ordinality as t(name, ordinality)
  where nullif(trim(name), '') is not null;

  return new_trip;
end;
$$;

drop function if exists public.complete_trip(uuid, timestamptz, text);

create or replace function public.complete_trip(
  trip_id uuid,
  return_time timestamptz,
  return_notes text default null,
  return_odometer numeric default null
)
returns void
language plpgsql
as $$
declare
  trip record;
begin
  select t.departure_time, t.departure_odometer, t.vehicle_id into trip
  from public.trips t
  where t.id = complete_trip.trip_id and t.deleted_at is null;

  if trip.departure_time is null then
    raise exception 'Trip was not found.';
  end if;

  if complete_trip.return_time < trip.departure_time then
    raise exception 'The return time cannot be before the vehicle left.';
  end if;

  if complete_trip.return_odometer is not null
     and trip.departure_odometer is not null
     and complete_trip.return_odometer < trip.departure_odometer then
    raise exception 'The vehicle cannot come back on a lower reading than it left on (%).',
      public.format_km(trip.departure_odometer);
  end if;

  update public.trips
  set return_time = complete_trip.return_time,
      return_notes = complete_trip.return_notes,
      return_odometer = complete_trip.return_odometer,
      status = 'completed',
      updated_by = auth.uid()
  where id = complete_trip.trip_id;

  -- Only ever forward, exactly as a fuel log does. A trip closed a week late,
  -- after a service has already moved the vehicle past that reading, records
  -- what the trip did without winding the vehicle back. Moving the reading
  -- fires vehicle_odometer_changed, which re-evaluates what is now due.
  if complete_trip.return_odometer is not null then
    update public.vehicles v
    set current_odometer = complete_trip.return_odometer,
        updated_at = now()
    where v.id = trip.vehicle_id
      and v.deleted_at is null
      and v.current_odometer < complete_trip.return_odometer;
  end if;
end;
$$;

-- Editing a trip's reading afterwards has to move the vehicle too, or a
-- correction typed into the trip would sit there doing nothing.
create or replace function public.trip_advances_odometer()
returns trigger
language plpgsql
as $$
begin
  if new.deleted_at is not null or new.return_odometer is null then
    return new;
  end if;

  update public.vehicles v
  set current_odometer = new.return_odometer,
      updated_at = now()
  where v.id = new.vehicle_id
    and v.deleted_at is null
    and v.current_odometer < new.return_odometer;

  return new;
end;
$$;

drop trigger if exists trip_advances_odometer on public.trips;

create trigger trip_advances_odometer
  after insert or update of return_odometer, vehicle_id, deleted_at on public.trips
  for each row
  execute function public.trip_advances_odometer();

-- ---------------------------------------------------------------------------
-- What a trip cost, and how far it went
-- ---------------------------------------------------------------------------

-- Dropped rather than replaced: `t.*` now carries the two new columns, which
-- lands them in the middle of the view's column list, and a replacement may
-- only append. Nothing else selects from this view — the two functions that
-- read it are functions, which do not hold the view open.
drop view if exists public.trips_with_people;

create view public.trips_with_people as
  select
    t.*,
    coalesce((select array_agg(d.driver_name order by d.sort_order, d.created_at)
              from public.trip_drivers d
              where d.trip_id = t.id and d.deleted_at is null), array[]::text[]) as drivers,
    coalesce((select array_agg(p.passenger_name order by p.sort_order, p.created_at)
              from public.trip_passengers p
              where p.trip_id = t.id and p.deleted_at is null), array[]::text[]) as passengers,
    coalesce((select array_agg(x.destination_name order by x.sort_order, x.created_at)
              from public.trip_destinations x
              where x.trip_id = t.id and x.deleted_at is null), array[]::text[]) as destinations,
    v.vehicle_name,
    case
      when t.return_odometer is not null and t.departure_odometer is not null
        then t.return_odometer - t.departure_odometer
    end as distance_km,
    coalesce((select sum(f.total_amount) from public.fuel_logs f
              where f.trip_id = t.id and f.deleted_at is null), 0) as fuel_total,
    -- Only expenses that are not a re-entry of a cost already recorded
    -- elsewhere, which is the same rule direct_expenses applies to the reports.
    coalesce((select sum(e.amount) from public.expenses e
              where e.trip_id = t.id and e.deleted_at is null
                and e.related_record_type is null), 0) as expense_total
  from public.trips t
  left join public.vehicles v on v.id = t.vehicle_id
  where t.deleted_at is null;

alter view public.trips_with_people set (security_invoker = on);
