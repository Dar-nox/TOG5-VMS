-- Retiring a vehicle stops it asking for attention.
--
-- `refresh_maintenance_alerts_for_vehicle` has always known what to do with an
-- archived vehicle — it resolves everything outstanding and raises nothing new,
-- and has since migration 6. Nothing ever called it when a vehicle was archived.
--
-- The app writes `status = 'archived'` straight to the row (`archiveVehicle` in
-- `vehicles.ts`), so the alerts it already had stayed active. The vehicle then
-- drops out of the fleet list, which is where this gets unpleasant: the alerts
-- name something the client can no longer open, on the Alerts screen and in the
-- daily digest, until some unrelated refresh happens to clear them.
--
-- A trigger rather than a call added to the client, because the row can be
-- written from more than one place — the vehicle editor also changes status —
-- and a rule about what a fleet means belongs next to the fleet.
--
-- Symmetrical on purpose. Bringing a vehicle back raises what it is overdue
-- for, which the same function already does; without that, an un-retired
-- vehicle would sit there looking perfectly healthy while its service dates
-- receded into the past.

create or replace function public.vehicle_archived_changed()
returns trigger
language plpgsql
as $$
declare
  was_archived boolean := old.status = 'archived' or old.archived_at is not null;
  is_archived boolean := new.status = 'archived' or new.archived_at is not null;
begin
  -- A soft-deleted vehicle is a different thing and has its own cascade. Its
  -- alerts are resolved there, and refreshing one would raise an exception
  -- rather than doing nothing.
  if new.deleted_at is not null then
    return null;
  end if;

  if was_archived is distinct from is_archived then
    perform public.refresh_maintenance_alerts_for_vehicle(new.id);
  end if;

  return null;
end;
$$;

drop trigger if exists vehicle_archived_changed on public.vehicles;

create trigger vehicle_archived_changed
  after update of status, archived_at on public.vehicles
  for each row
  when (
    old.status is distinct from new.status
    or old.archived_at is distinct from new.archived_at
  )
  execute function public.vehicle_archived_changed();

comment on function public.vehicle_archived_changed is
  'Retiring or un-retiring a vehicle re-evaluates its alerts. The refresh function already handled archived vehicles; nothing called it.';

-- Anything archived before this trigger existed still has its alerts. One pass
-- to bring the fleet into line, in both directions — the same shape of repair
-- as the odometer backfill in migration 22.
do $$
declare
  vehicle record;
begin
  for vehicle in
    select v.id from public.vehicles v where v.deleted_at is null
  loop
    perform public.refresh_maintenance_alerts_for_vehicle(vehicle.id);
  end loop;
end $$;
