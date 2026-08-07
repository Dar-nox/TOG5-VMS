-- Archiving anything at all was refused, and this fixes it.
--
-- Found while writing the restore tests. Every archive in the app failed with
-- "new row violates row-level security policy", from the first day the online
-- build existed, and the reason is a rule of Postgres that reads backwards:
--
--   The read policies say `using (is_active_user() and deleted_at is null)`.
--   Because an UPDATE with a WHERE clause needs SELECT rights on the table,
--   Postgres also applies the SELECT policy to the row *as it will be after the
--   update*. Setting `deleted_at` makes the new row fail that policy — so the
--   very act of archiving a row is what makes archiving it forbidden.
--
-- Nothing was wrong with the policies. `deleted_at is null` in the read policy
-- is the design and stays: it is what makes a forgotten WHERE clause harmless.
-- What was wrong is that the writes ran under it. Archiving is a write that
-- must be allowed to make a row invisible, which means it belongs in a function
-- that runs as the definer, exactly like restoring does.
--
-- Nobody noticed because the client is still on the old desktop build and the
-- test suite ran these updates as the superuser, which bypasses RLS entirely —
-- the same shape of blind spot as the missing grants recorded in migration 15,
-- and worth writing down twice.
--
-- Every function below therefore checks the caller itself. `security definer`
-- turns the policies off, so the guard the policy used to provide has to be
-- written out. Archiving is ordinary daily work, so the bar is an active
-- account rather than the owner.

-- ---------------------------------------------------------------------------
-- Trips
-- ---------------------------------------------------------------------------

create or replace function public.archive_trip(trip_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_active_user() then
    raise exception 'Your account is not active, so it cannot archive records.';
  end if;

  -- The cascade trigger takes the drivers, passengers and destinations with it.
  -- Those updates were failing for the same reason as this one and are fixed by
  -- the same change: a trigger fired from here inherits the definer's rights.
  update public.trips t
  set deleted_at = now(), updated_by = auth.uid(), updated_at = now()
  where t.id = archive_trip.trip_id and t.deleted_at is null;

  if not found then
    raise exception 'Trip was not found or is already archived.';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Fuel
-- ---------------------------------------------------------------------------

create or replace function public.archive_fuel_log(log_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_active_user() then
    raise exception 'Your account is not active, so it cannot archive records.';
  end if;

  -- Efficiency for the whole vehicle recalculates from a trigger afterwards,
  -- since removing a fill changes the readings either side of it.
  update public.fuel_logs f
  set deleted_at = now(), updated_by = auth.uid(), updated_at = now()
  where f.id = archive_fuel_log.log_id and f.deleted_at is null;

  if not found then
    raise exception 'Fuel log was not found or is already archived.';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- The three that already existed
-- ---------------------------------------------------------------------------
--
-- Unchanged apart from running as the definer and checking the caller. Their
-- bodies are reproduced rather than patched because `create or replace` cannot
-- alter one clause of a function in place.

create or replace function public.archive_expense(expense_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_active_user() then
    raise exception 'Your account is not active, so it cannot archive records.';
  end if;

  update public.expenses e
  set deleted_at = now(), updated_by = auth.uid(), updated_at = now()
  where e.id = archive_expense.expense_id and e.deleted_at is null;

  if not found then
    raise exception 'Expense was not found or is already archived.';
  end if;
end;
$$;

create or replace function public.archive_vehicle_maintenance_setting(setting_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  schedule record;
begin
  if not public.is_active_user() then
    raise exception 'Your account is not active, so it cannot archive records.';
  end if;

  if not exists (select 1 from public.vehicle_maintenance_settings s
                 where s.id = archive_vehicle_maintenance_setting.setting_id) then
    raise exception 'Maintenance reminder was not found.';
  end if;

  update public.vehicle_maintenance_settings
  set status = 'disabled', deleted_at = now()
  where id = archive_vehicle_maintenance_setting.setting_id;

  for schedule in
    select id from public.maintenance_schedules
    where vehicle_maintenance_setting_id = archive_vehicle_maintenance_setting.setting_id
      and deleted_at is null
  loop
    perform public.resolve_stale_schedule_alerts(schedule.id, null);
  end loop;

  update public.maintenance_schedules
  set status = 'disabled', archived_at = now()
  where vehicle_maintenance_setting_id = archive_vehicle_maintenance_setting.setting_id
    and deleted_at is null;
end;
$$;

create or replace function public.archive_maintenance_template(template_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  schedule record;
begin
  if not public.is_active_user() then
    raise exception 'Your account is not active, so it cannot archive records.';
  end if;

  -- Every table is aliased: the parameter is called template_id too, and an
  -- unqualified column of that name is ambiguous rather than wrong-but-working.
  update public.maintenance_templates t
  set is_active = false
  where t.id = archive_maintenance_template.template_id;

  update public.vehicle_maintenance_settings s
  set status = 'disabled', deleted_at = now()
  where s.template_id = archive_maintenance_template.template_id and s.deleted_at is null;

  for schedule in
    select m.id from public.maintenance_schedules m
    where m.template_id = archive_maintenance_template.template_id and m.deleted_at is null
  loop
    perform public.resolve_stale_schedule_alerts(schedule.id, null);
  end loop;

  update public.maintenance_schedules m
  set status = 'disabled', archived_at = now()
  where m.template_id = archive_maintenance_template.template_id and m.deleted_at is null;
end;
$$;

comment on function public.archive_trip is
  'Runs as the definer: an UPDATE that sets deleted_at cannot satisfy a read policy that filters on it.';
comment on function public.archive_fuel_log is
  'Runs as the definer: an UPDATE that sets deleted_at cannot satisfy a read policy that filters on it.';
