-- Records say who entered them.
--
-- Half of this already worked. `created_by` and `updated_by` were added to the
-- record-bearing tables at port time (initial schema, and the header there says
-- why: adding attribution after a year of history is far more expensive than
-- adding it on day one). Every RPC write path already fills them — start_trip,
-- save_expense, log_maintenance, the archive family, restore_record.
--
-- Three gaps, which is why nothing could be shown:
--
--   1. Four paths insert straight from the browser rather than through an RPC —
--      vehicles, fuel logs, vehicle photos, vehicle documents — and left
--      `created_by` null. A column default closes it without the client having
--      to remember, which is the same reason `push_subscriptions.profile_id`
--      defaults to `auth.uid()` (migration 28).
--
--   2. `updated_by` was never maintained on update. The RPCs set it; a plain
--      update did not.
--
--   3. Reminders and templates had no attribution columns at all, and a
--      reminder is very much something a person creates.
--
-- Nothing displayed it either: the read views select `x.*`, so `created_by` was
-- already there as a bare uuid with nothing to turn it into a name. The views
-- below gain `created_by_name`.

-- ---------------------------------------------------------------------------
-- 1. Fill it in without asking the client to
-- ---------------------------------------------------------------------------
--
-- A default rather than a NOT NULL: a row whose author is genuinely unknown is
-- a real state. The client's history is imported from the desktop app, where
-- there was one shared login and no per-record author, so those rows carry null
-- and the app reads them as "Imported from desktop". Claiming the owner typed
-- them would make every other name on the screen less believable.

alter table public.vehicles alter column created_by set default auth.uid();
alter table public.vehicle_photos alter column created_by set default auth.uid();
alter table public.vehicle_documents alter column created_by set default auth.uid();
alter table public.fuel_logs alter column created_by set default auth.uid();
alter table public.maintenance_logs alter column created_by set default auth.uid();
alter table public.repair_records alter column created_by set default auth.uid();
alter table public.expenses alter column created_by set default auth.uid();
alter table public.trips alter column created_by set default auth.uid();

-- ---------------------------------------------------------------------------
-- 2. Keep `updated_by` current
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_by()
returns trigger
language plpgsql
as $$
begin
  -- Only when somebody is actually calling. A good deal of what updates these
  -- rows is not a person: the odometer triggers, the alert refresh, the
  -- nightly digest through pg_cron. `auth.uid()` is null in all of those, and
  -- writing that null would erase the name of whoever last touched the record
  -- by hand — which is worse than not tracking it at all, because the field
  -- would look answered.
  if auth.uid() is not null then
    new.updated_by = auth.uid();
  end if;

  return new;
end;
$$;

comment on function public.set_updated_by is
  'Mirrors set_updated_at for attribution. Leaves updated_by alone when there is no caller, so background work does not erase a person.';

do $$
declare
  target text;
begin
  foreach target in array array[
    'vehicles', 'vehicle_documents', 'fuel_logs', 'maintenance_logs',
    'repair_records', 'expenses', 'trips'
  ]
  loop
    execute format('drop trigger if exists set_updated_by on public.%I', target);
    execute format(
      'create trigger set_updated_by before update on public.%I
         for each row execute function public.set_updated_by()', target);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 3. The two tables that had none
-- ---------------------------------------------------------------------------

alter table public.vehicle_maintenance_settings
  add column if not exists created_by uuid references public.profiles(id) on delete set null
    default auth.uid(),
  add column if not exists updated_by uuid references public.profiles(id) on delete set null;

alter table public.maintenance_templates
  add column if not exists created_by uuid references public.profiles(id) on delete set null
    default auth.uid(),
  add column if not exists updated_by uuid references public.profiles(id) on delete set null;

do $$
declare
  target text;
begin
  foreach target in array array['vehicle_maintenance_settings', 'maintenance_templates']
  loop
    execute format('drop trigger if exists set_updated_by on public.%I', target);
    execute format(
      'create trigger set_updated_by before update on public.%I
         for each row execute function public.set_updated_by()', target);
  end loop;
end $$;

-- The RPC that writes a reminder predates the column, so it does not name it.
-- The default covers an insert; an edit goes through the same function and is
-- an update, which the trigger covers.

-- ---------------------------------------------------------------------------
-- 4. Turning a uuid into a name — no schema needed
-- ---------------------------------------------------------------------------
--
-- Deliberately nothing here.
--
-- The obvious move was to join `profiles` into each of the four detail views so
-- they carry a `created_by_name`. That means restating all four in full,
-- including the jsonb warning aggregation in `fuel_logs_detailed`, to add one
-- column to each — and it would still miss any table whose view nobody thought
-- to change.
--
-- It is not necessary. `created_by` already reaches the client: the views
-- select `x.*`, and it has been in them since they were written. And every
-- signed-in user may already read `profiles` — "signed in users can see
-- colleagues" in migration 2. So the app fetches the handful of profiles once
-- and resolves the name itself, which works for every table at once and for any
-- added later.
--
-- The fleet has a single-figure number of accounts. If that ever stopped being
-- true, a joined column would start earning its keep.
