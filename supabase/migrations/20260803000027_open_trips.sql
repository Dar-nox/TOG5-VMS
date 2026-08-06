-- Which vehicles are out right now.
--
-- `trips.status` has always known this and nothing ever asked. With trips
-- living inside a vehicle, the only way to find out was to open each vehicle in
-- turn and look at its Trips tab — so for the one question a dispatcher asks
-- most often, the app was worse than the noticeboard it replaced.
--
-- A separate function rather than another section inside dashboard_overview():
-- that one exists to collapse eight sequential round trips into one, and two
-- requests fired together cost the same as one. Restating three hundred lines
-- to add ten is the more expensive kind of cheap.

create or replace function public.open_trips()
returns jsonb
language sql
stable
as $$
  select coalesce(jsonb_agg(item order by departed), '[]'::jsonb)
  from (
    select jsonb_build_object(
             'id', t.id,
             'vehicleId', t.vehicle_id,
             'vehicleName', t.vehicle_name,
             'reason', t.reason,
             'departureTime', t.departure_time,
             'departureOdometer', t.departure_odometer,
             'drivers', to_jsonb(t.drivers),
             'destinations', to_jsonb(t.destinations),
             'spentSoFar', t.fuel_total + t.expense_total
           ) as item,
           -- Longest out first: a van that left three days ago is the one worth
           -- asking about, not the one that left after breakfast.
           t.departure_time as departed
    from public.trips_with_people t
    where t.status = 'open'
  ) out_now;
$$;

comment on function public.open_trips is
  'Every vehicle currently out, fleet-wide, oldest departure first.';
