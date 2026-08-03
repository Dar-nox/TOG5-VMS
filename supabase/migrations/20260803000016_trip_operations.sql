-- Starting and finishing a trip.
--
-- A trip is four tables: the trip plus its drivers, passengers, and
-- destinations. Writing them from the browser would be four requests that can
-- fail halfway, leaving a trip with no driver on it. One call instead.

create or replace function public.start_trip(
  vehicle_id uuid,
  departure_time timestamptz,
  reason text,
  drivers text[] default array[]::text[],
  passengers text[] default array[]::text[],
  destinations text[] default array[]::text[],
  departure_notes text default null
)
returns uuid
language plpgsql
as $$
declare
  new_trip uuid;
begin
  if not exists (select 1 from public.vehicles v
                 where v.id = start_trip.vehicle_id and v.deleted_at is null) then
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
                            status, created_by, updated_by)
  values (start_trip.vehicle_id, start_trip.departure_time, start_trip.reason,
          start_trip.departure_notes, 'open', auth.uid(), auth.uid())
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

create or replace function public.complete_trip(
  trip_id uuid,
  return_time timestamptz,
  return_notes text default null
)
returns void
language plpgsql
as $$
declare
  departed timestamptz;
begin
  select t.departure_time into departed
  from public.trips t
  where t.id = complete_trip.trip_id and t.deleted_at is null;

  if departed is null then
    raise exception 'Trip was not found.';
  end if;

  if complete_trip.return_time < departed then
    raise exception 'The return time cannot be before the vehicle left.';
  end if;

  update public.trips
  set return_time = complete_trip.return_time,
      return_notes = complete_trip.return_notes,
      status = 'completed',
      updated_by = auth.uid()
  where id = complete_trip.trip_id;
end;
$$;

create or replace function public.trip_reports_overview(
  vehicle_id uuid default null,
  start_date date default null,
  end_date date default null
)
returns jsonb
language sql
stable
as $$
  with scoped as (
    select t.*
    from public.trips_with_people t
    where (trip_reports_overview.vehicle_id is null
           or t.vehicle_id = trip_reports_overview.vehicle_id)
      and (start_date is null or t.departure_time::date >= start_date)
      and (end_date is null or t.departure_time::date <= end_date)
  )
  select jsonb_build_object(
    'totalTrips', (select count(*) from scoped),
    'openTrips', (select count(*) from scoped where status = 'open'),
    'completedTrips', (select count(*) from scoped where status = 'completed'),
    'cancelledTrips', (select count(*) from scoped where status = 'cancelled'),
    'tripsByVehicle', coalesce((
      select jsonb_agg(jsonb_build_object('label', vehicle_name, 'count', c)
                       order by c desc, vehicle_name)
      from (select vehicle_name, count(*) c from scoped group by vehicle_name) v
    ), '[]'::jsonb),
    'tripsByDriver', coalesce((
      select jsonb_agg(jsonb_build_object('label', name, 'count', trip_count))
      from public.trip_top_counts('drivers', start_date, end_date)
    ), '[]'::jsonb),
    'tripsByDestination', coalesce((
      select jsonb_agg(jsonb_build_object('label', name, 'count', trip_count))
      from public.trip_top_counts('destinations', start_date, end_date)
    ), '[]'::jsonb),
    'recentTrips', coalesce((
      select jsonb_agg(to_jsonb(r) order by r.departure_time desc)
      from (select * from scoped order by departure_time desc limit 10) r
    ), '[]'::jsonb)
  );
$$;
