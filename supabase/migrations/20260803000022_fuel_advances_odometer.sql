-- Recording fuel moves the vehicle's odometer forward.
--
-- This was missed in the port and it is the worst kind of miss: nothing errors,
-- the fuel log saves, and the vehicle quietly stays on whatever reading it had.
-- Every maintenance reminder measured in kilometres then waits for a distance
-- the vehicle never appears to travel, so nothing is ever due and no alert is
-- ever raised. A fleet would look perfectly healthy while its services fell
-- further and further behind.
--
-- Ported from update_vehicle_odometer_if_higher in fuel/repository.rs, called
-- on both create and update there. Only ever forward: a fill-up recorded late,
-- with an older reading, must not wind the vehicle back.
--
-- The desktop app stopped there, and left maintenance alerts to be recalculated
-- whenever somebody opened the alerts screen. That worked when one person used
-- one machine. Now the person recording fuel is on a phone at a petrol station
-- and the person who needs the alert is in the office, so the recalculation
-- happens here instead of waiting for the right screen to be opened.

create or replace function public.fuel_log_advances_odometer()
returns trigger
language plpgsql
as $$
begin
  if new.deleted_at is not null or new.odometer is null then
    return new;
  end if;

  -- Moving the reading is all this does. Working out what is now due follows
  -- from the vehicle changing, and is handled once, below, for every way that
  -- can happen.
  update public.vehicles v
  set current_odometer = new.odometer,
      updated_at = now()
  where v.id = new.vehicle_id
    and v.deleted_at is null
    and v.current_odometer < new.odometer;

  return new;
end;
$$;

drop trigger if exists fuel_log_advances_odometer on public.fuel_logs;

create trigger fuel_log_advances_odometer
  after insert or update of odometer, vehicle_id, deleted_at on public.fuel_logs
  for each row
  execute function public.fuel_log_advances_odometer();

-- Bring existing vehicles into line. Without this, anything recorded before
-- the trigger existed stays behind — which is the whole fleet, since the port
-- never advanced a single reading.
do $$
declare
  vehicle record;
begin
  for vehicle in
    select v.id, max(f.odometer) as highest
    from public.vehicles v
    join public.fuel_logs f on f.vehicle_id = v.id and f.deleted_at is null
    where v.deleted_at is null
    group by v.id
    having max(f.odometer) > max(v.current_odometer)
  loop
    update public.vehicles set current_odometer = vehicle.highest, updated_at = now()
    where id = vehicle.id;

    -- Called directly: the trigger that would otherwise do this is created
    -- further down, so it is not listening yet.
    perform public.refresh_maintenance_alerts_for_vehicle(vehicle.id);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- The same, for the other two things that move the odometer
-- ---------------------------------------------------------------------------
--
-- Recording service already moved the reading forward — that half was ported.
-- What neither path did was look at the vehicle's *other* reminders
-- afterwards. Finishing an oil change at 30,000 km can put a van past the due
-- point for its brake inspection, and until somebody opened the right screen
-- nothing said so.
--
-- Doing it in one place means the answer does not depend on which screen the
-- person happened to be looking at, or which of them was holding the phone.

create or replace function public.refresh_after_odometer_change(vehicle_id uuid)
returns void
language plpgsql
as $$
begin
  if exists (select 1 from public.vehicles v
             where v.id = refresh_after_odometer_change.vehicle_id and v.deleted_at is null) then
    perform public.refresh_maintenance_alerts_for_vehicle(
      refresh_after_odometer_change.vehicle_id
    );
  end if;
end;
$$;

create or replace function public.vehicle_odometer_changed()
returns trigger
language plpgsql
as $$
begin
  if new.deleted_at is null and new.current_odometer is distinct from old.current_odometer then
    perform public.refresh_after_odometer_change(new.id);
  end if;

  return new;
end;
$$;

drop trigger if exists vehicle_odometer_changed on public.vehicles;

-- Covers every way the reading moves: a fill-up, a completed service, and
-- somebody correcting it by hand on the vehicle screen.
create trigger vehicle_odometer_changed
  after update of current_odometer on public.vehicles
  for each row
  execute function public.vehicle_odometer_changed();
