-- The archive says what each record actually was.
--
-- `archived_records` returns one 8-key shape for four kinds of record, and the
-- first version filled in only the keys every kind happened to share. The rest
-- were hard-coded null — three of the eight for a trip, four for a reminder.
--
-- A reminder therefore appeared as its name and the date it was archived and
-- nothing else. Given two rows reading "Battery - Inspect/Replace (Hilux
-- Pickup)" there was no way to tell which vehicle's you were about to bring
-- back, what interval it had been set to, or whether anyone had ever acted on
-- it. Restore is the one thing that screen does, and it was asking people to
-- decide blind.
--
-- Same signature and the same eight keys, so `ArchivedRecord` in
-- `src/services/api/archive.ts` is untouched.
--
-- One known limit, accepted rather than overlooked: the strings built here are
-- formatted server-side, so they do not follow the distance unit chosen in
-- Settings — a fleet switched to miles would read "5,000 km" in this one place.
-- The existing summary already hardcodes " L" for the same reason. The client
-- is Philippine and works in kilometres; if that ever changes, this and the
-- litres line are what to revisit.

create or replace function public.archived_records()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not public.is_owner() then
    raise exception 'Only the owner can see archived records.';
  end if;

  with archived as (
    select
      t.deleted_at as archived_at,
      jsonb_build_object(
        'kind', 'trip',
        'id', t.id,
        'vehicleName', coalesce(v.vehicle_name, 'Unknown vehicle'),
        'summary', t.reason,
        -- Who drove it and where it went. Two trips both called "Delivery run"
        -- are otherwise indistinguishable, which is exactly the pair somebody
        -- is trying to choose between.
        --
        -- The children were soft-deleted by `cascade_trip_soft_delete` with the
        -- trip's own timestamp, so they match on it. A driver removed from the
        -- trip earlier carries a different one and stays out, which is right —
        -- they were taken off before it was archived.
        'detail', nullif(concat_ws(' · ',
          nullif((select string_agg(d.driver_name, ', ' order by d.sort_order, d.created_at)
                  from public.trip_drivers d
                  where d.trip_id = t.id and d.deleted_at = t.deleted_at), ''),
          nullif((select string_agg(x.destination_name, ', ' order by x.sort_order, x.created_at)
                  from public.trip_destinations x
                  where x.trip_id = t.id and x.deleted_at = t.deleted_at), '')
        ), ''),
        -- What it cost, by the same rule `trips_with_people` uses for a live
        -- one: fuel bought on the trip, plus expenses booked against it that
        -- are not a re-entry of a cost already recorded elsewhere. Archiving a
        -- trip does not cascade to either, so both are still here.
        --
        -- `nullif(..., 0)` because a trip that cost nothing recorded should
        -- show no amount rather than ₱0.00, which reads like a measurement
        -- somebody took.
        'amount', nullif(
          coalesce((select sum(f.total_amount) from public.fuel_logs f
                    where f.trip_id = t.id and f.deleted_at is null), 0)
          + coalesce((select sum(e.amount) from public.expenses e
                      where e.trip_id = t.id and e.deleted_at is null
                        and e.related_record_type is null), 0),
          0),
        'occurredOn', t.departure_time,
        'archivedAt', t.deleted_at
      ) as item
    from public.trips t
    left join public.vehicles v on v.id = t.vehicle_id
    where t.deleted_at is not null

    union all

    select
      f.deleted_at,
      jsonb_build_object(
        'kind', 'fuel',
        'id', f.id,
        'vehicleName', coalesce(v.vehicle_name, 'Unknown vehicle'),
        -- `trim_scale` rather than a to_char mask: the column stores three
        -- decimal places and almost nothing uses them, and "40.000 L" reads
        -- like a measurement nobody took.
        'summary', trim_scale(f.liters)::text || ' L',
        -- The reading is what separates two fills at the same station in the
        -- same week. No unit on it, since that one is a display preference.
        'detail', nullif(concat_ws(' · ',
          f.station_name,
          'odometer ' || to_char(f.odometer, 'FM999,999,999')
        ), ''),
        'amount', f.total_amount,
        'occurredOn', f.fuel_date,
        'archivedAt', f.deleted_at
      )
    from public.fuel_logs f
    left join public.vehicles v on v.id = f.vehicle_id
    where f.deleted_at is not null

    union all

    select
      e.deleted_at,
      jsonb_build_object(
        'kind', 'expense',
        'id', e.id,
        -- An expense may have no vehicle at all; the column is nullable, unlike
        -- every other table here.
        'vehicleName', coalesce(v.vehicle_name, 'No vehicle'),
        'summary', e.description,
        -- The stored key, turned into words by the app — which is where every
        -- other screen does it, so all of them stay in step if the wording of a
        -- category ever changes.
        'detail', e.category,
        'amount', e.amount,
        'occurredOn', e.expense_date,
        'archivedAt', e.deleted_at
      )
    from public.expenses e
    left join public.vehicles v on v.id = e.vehicle_id
    where e.deleted_at is not null

    union all

    select
      s.deleted_at,
      jsonb_build_object(
        'kind', 'reminder',
        'id', s.id,
        'vehicleName', coalesce(v.vehicle_name, 'Unknown vehicle'),
        'summary', t.name,
        -- What it was set to do. A reminder with no interval at all is a real
        -- state — the app calls it "not tracked" — and stays null here rather
        -- than claiming an interval it does not have.
        'detail', case
          when s.custom_time_interval_days is not null
               and s.custom_odometer_interval_km is not null
            then format('Every %s days or %s km',
                        s.custom_time_interval_days,
                        to_char(s.custom_odometer_interval_km, 'FM999,999,999'))
          when s.custom_time_interval_days is not null
            then format('Every %s days', s.custom_time_interval_days)
          when s.custom_odometer_interval_km is not null
            then format('Every %s km',
                        to_char(s.custom_odometer_interval_km, 'FM999,999,999'))
        end,
        'amount', null,
        -- When it was last done. Null for one nobody has ever acted on, which
        -- is itself worth seeing: restoring a reminder that has never been
        -- serviced means something different from restoring one that has.
        --
        -- The schedule is soft-deleted alongside the setting, so this does not
        -- filter on `deleted_at`.
        'occurredOn', (select sch.last_completed_date
                       from public.maintenance_schedules sch
                       where sch.vehicle_maintenance_setting_id = s.id
                       order by sch.updated_at desc
                       limit 1),
        'archivedAt', s.deleted_at
      )
    from public.vehicle_maintenance_settings s
    join public.maintenance_templates t on t.id = s.template_id
    left join public.vehicles v on v.id = s.vehicle_id
    where s.deleted_at is not null
  )
  select coalesce(jsonb_agg(item order by archived_at desc), '[]'::jsonb)
  into result
  from archived;

  return result;
end;
$$;

comment on function public.archived_records is
  'Owner-only. Soft-deleted rows are invisible to the read policies, so this runs as the definer. Each kind fills all eight keys it can rather than nulling what does not fit every kind.';
