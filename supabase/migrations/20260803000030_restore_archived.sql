-- Bringing back something that was archived by mistake.
--
-- Nothing in this app is ever really deleted — every destructive action sets
-- `deleted_at` and the row stays where it is. Until now nothing could be
-- recovered either, so the most likely way to lose data here was somebody
-- pressing Archive on the wrong line, and the only way back was writing SQL
-- against the production database.
--
-- Both halves of this have to run as the definer, and that is the interesting
-- part. The read policies filter `deleted_at is null`, so an archived row does
-- not exist as far as PostgREST is concerned: an owner cannot list them, and
-- the UPDATE policy's USING clause means they could not clear the flag even if
-- they knew the id. That default is right — it is what stops a forgotten WHERE
-- clause resurrecting things — so rather than loosening the policies, restore
-- is one deliberate exception in one file, gated on being the owner.
--
-- Vehicles are not here. Archiving a vehicle sets `status = 'archived'` and
-- leaves the row visible, and the vehicle editor already changes it back; it is
-- a state the fleet has, not a deletion.

-- ---------------------------------------------------------------------------
-- What is in the archive
-- ---------------------------------------------------------------------------
--
-- Amounts and dates go back raw rather than formatted. The app already knows
-- the fleet's currency and the date style somebody chose in Settings, and a
-- screen that formats them differently from every other screen looks like a
-- different app.

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
        'detail', null,
        'amount', null,
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
        'detail', f.station_name,
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
        'detail', null,
        'amount', null,
        'occurredOn', null,
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
  'Owner-only. Soft-deleted rows are invisible to the read policies, so this runs as the definer.';

-- ---------------------------------------------------------------------------
-- Putting one back
-- ---------------------------------------------------------------------------

create or replace function public.restore_record(kind text, record_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  -- Not inferred from `restored_vehicle`: an expense is allowed to belong to no
  -- vehicle at all, so a successful restore can leave that null.
  restored boolean := false;
  restored_vehicle uuid;
  schedule record;
  evaluation public.due_evaluation;
begin
  if not public.is_owner() then
    raise exception 'Only the owner can restore an archived record.';
  end if;

  case kind
    when 'trip' then
      -- The cascade trigger on `deleted_at` brings the drivers, passengers and
      -- destinations back with it, matching on the instant they were archived,
      -- so people removed from the trip beforehand stay removed.
      update public.trips t
      set deleted_at = null, updated_by = auth.uid(), updated_at = now()
      where t.id = restore_record.record_id and t.deleted_at is not null
      returning t.vehicle_id into restored_vehicle;

      restored := found;

    when 'fuel' then
      -- Efficiency recalculates itself: the trigger for it watches
      -- `deleted_at`, because removing a fill changes the readings either side
      -- of it and so does putting one back.
      update public.fuel_logs f
      set deleted_at = null, updated_by = auth.uid(), updated_at = now()
      where f.id = restore_record.record_id and f.deleted_at is not null
      returning f.vehicle_id into restored_vehicle;

      restored := found;

    when 'expense' then
      update public.expenses e
      set deleted_at = null, updated_by = auth.uid(), updated_at = now()
      where e.id = restore_record.record_id and e.deleted_at is not null
      returning e.vehicle_id into restored_vehicle;

      restored := found;

    when 'reminder' then
      update public.vehicle_maintenance_settings s
      set status = 'active', deleted_at = null, updated_at = now()
      where s.id = restore_record.record_id and s.deleted_at is not null
      returning s.vehicle_id into restored_vehicle;

      restored := found;

      if restored then
        -- Archiving the reminder disabled and archived its schedule. Bring it
        -- back on the dates it already held rather than calling
        -- recalculate_schedule_for_setting, which measures the next service
        -- from today: a van two months overdue would come back as freshly
        -- serviced, which is the one answer nobody wants.
        for schedule in
          select sc.id, sc.next_due_date, sc.next_due_odometer,
                 sc.due_soon_days, sc.due_soon_km, v.current_odometer
          from public.maintenance_schedules sc
          join public.vehicles v on v.id = sc.vehicle_id
          where sc.vehicle_maintenance_setting_id = restore_record.record_id
            and sc.deleted_at is null
            and sc.archived_at is not null
        loop
          evaluation := public.evaluate_due_status(
            current_date,
            schedule.current_odometer,
            schedule.next_due_date,
            schedule.next_due_odometer,
            schedule.due_soon_days,
            schedule.due_soon_km,
            false
          );

          update public.maintenance_schedules
          set archived_at = null,
              status = evaluation.status,
              updated_at = now()
          where id = schedule.id;
        end loop;

        perform public.refresh_maintenance_alerts_for_vehicle(restored_vehicle);
      end if;

    else
      raise exception 'Unknown kind of archived record: %.', kind;
  end case;

  if not restored then
    raise exception 'That record was not found, or it is not archived.';
  end if;

  -- Raising here undoes the update above, since the whole function is one
  -- statement. Nothing in the app soft-deletes a vehicle today, so this is a
  -- guard rather than a path anybody walks — but a record restored under an
  -- invisible vehicle would be invisible too, and would look like a restore
  -- that silently did nothing.
  if exists (
    select 1 from public.vehicles v
    where v.id = restored_vehicle and v.deleted_at is not null
  ) then
    raise exception 'Restore the vehicle first — this record belongs to a vehicle that is archived.';
  end if;
end;
$$;

comment on function public.restore_record is
  'Owner-only. Clears deleted_at on one archived record and puts back whatever archiving it changed.';
