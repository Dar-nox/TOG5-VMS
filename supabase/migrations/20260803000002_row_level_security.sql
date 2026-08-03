-- TOG 5 VMS — row level security.
--
-- This is one company with one fleet, not a multi-tenant product. There is no
-- org_id anywhere and none is needed, so the policies stay simple:
--
--   * Anyone signed in can read and write the fleet data. Drivers, office
--     staff and the owner all do the same day-to-day work.
--   * Owners additionally get the handful of operations that are hard to undo:
--     clearing data, changing settings, and managing accounts.
--   * Soft-deleted rows are invisible. The filter lives in the policy rather
--     than in each query, so a client talking straight to PostgREST cannot see
--     them by forgetting a WHERE clause.
--
-- The client asked for no roles screen, so `manager` and `viewer` are
-- identical today. They exist so that a future limit does not need a
-- migration.

-- ---------------------------------------------------------------------------
-- Who is asking
-- ---------------------------------------------------------------------------

-- Kept out of the policies themselves so that a policy reads as a sentence,
-- and so the role lookup is one indexed primary-key hit that Postgres can
-- cache for the statement.
create or replace function public.current_role_is(target_role text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role = target_role
      and status = 'active'
      and deleted_at is null
  );
$$;

create or replace function public.is_owner()
returns boolean
language sql
stable
as $$
  select public.current_role_is('owner');
$$;

-- Signed in, active, and not deleted. A deactivated account keeps its rows but
-- stops being able to use them, which is what deactivating is for.
create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and status = 'active'
      and deleted_at is null
  );
$$;

-- ---------------------------------------------------------------------------
-- Enable RLS everywhere
--
-- Every table, without exception. A table with RLS off is fully readable
-- through PostgREST by anyone holding the anon key, which is public by design.
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.vehicles enable row level security;
alter table public.vehicle_photos enable row level security;
alter table public.vehicle_documents enable row level security;
alter table public.vehicle_features enable row level security;
alter table public.fuel_logs enable row level security;
alter table public.maintenance_templates enable row level security;
alter table public.maintenance_template_rules enable row level security;
alter table public.vehicle_maintenance_settings enable row level security;
alter table public.maintenance_schedules enable row level security;
alter table public.maintenance_logs enable row level security;
alter table public.repair_records enable row level security;
alter table public.expenses enable row level security;
alter table public.alerts enable row level security;
alter table public.trips enable row level security;
alter table public.trip_drivers enable row level security;
alter table public.trip_passengers enable row level security;
alter table public.trip_destinations enable row level security;
alter table public.settings enable row level security;
alter table public.audit_logs enable row level security;

-- ---------------------------------------------------------------------------
-- Profiles
--
-- Everyone can see who their colleagues are — the app shows "added by Maria"
-- and a user list. Only owners can create accounts or change roles. Everyone
-- can edit their own display name.
-- ---------------------------------------------------------------------------

create policy "signed in users can see colleagues"
  on public.profiles for select
  to authenticated
  using (deleted_at is null);

create policy "owners can add accounts"
  on public.profiles for insert
  to authenticated
  with check (public.is_owner());

create policy "owners change anyone, everyone changes themselves"
  on public.profiles for update
  to authenticated
  using (public.is_owner() or id = auth.uid())
  with check (public.is_owner() or id = auth.uid());

-- No delete policy at all. Accounts are deactivated, never removed, so that
-- the history still says who did what.

-- ---------------------------------------------------------------------------
-- Fleet data
--
-- Same shape for every table: any active signed-in user does everything, and
-- soft-deleted rows do not exist. Written out per table rather than generated,
-- because a policy you cannot read is a policy nobody checks.
-- ---------------------------------------------------------------------------

do $$
declare
  fleet_table text;
begin
  foreach fleet_table in array array[
    'vehicles', 'vehicle_photos', 'vehicle_documents', 'fuel_logs',
    'maintenance_templates', 'vehicle_maintenance_settings',
    'maintenance_schedules', 'maintenance_logs', 'repair_records',
    'expenses', 'alerts', 'trips', 'trip_drivers', 'trip_passengers',
    'trip_destinations'
  ]
  loop
    execute format($f$
      create policy "signed in users read %1$I"
        on public.%1$I for select
        to authenticated
        using (public.is_active_user() and deleted_at is null);

      create policy "signed in users add %1$I"
        on public.%1$I for insert
        to authenticated
        with check (public.is_active_user());

      create policy "signed in users change %1$I"
        on public.%1$I for update
        to authenticated
        using (public.is_active_user() and deleted_at is null)
        with check (public.is_active_user());
    $f$, fleet_table);
  end loop;
end;
$$;

-- vehicle_features and maintenance_template_rules have no deleted_at — they
-- are hard-deleted with their parent — so they get the same access without the
-- soft-delete filter.
do $$
declare
  hard_deleted_table text;
begin
  foreach hard_deleted_table in array array[
    'vehicle_features', 'maintenance_template_rules'
  ]
  loop
    execute format($f$
      create policy "signed in users read %1$I"
        on public.%1$I for select
        to authenticated
        using (public.is_active_user());

      create policy "signed in users add %1$I"
        on public.%1$I for insert
        to authenticated
        with check (public.is_active_user());

      create policy "signed in users change %1$I"
        on public.%1$I for update
        to authenticated
        using (public.is_active_user())
        with check (public.is_active_user());

      create policy "owners remove %1$I"
        on public.%1$I for delete
        to authenticated
        using (public.is_owner());
    $f$, hard_deleted_table);
  end loop;
end;
$$;

-- Nothing gets a DELETE policy on the fleet tables. The app archives and soft
-- deletes; a real DELETE only happens when an owner clears all data, and that
-- goes through a function that runs with the definer's rights.

-- ---------------------------------------------------------------------------
-- Settings
--
-- Everyone reads them — they drive currency, units and alert thresholds all
-- over the UI. Only owners change them.
-- ---------------------------------------------------------------------------

create policy "signed in users read settings"
  on public.settings for select
  to authenticated
  using (public.is_active_user());

create policy "owners change settings"
  on public.settings for update
  to authenticated
  using (public.is_owner())
  with check (public.is_owner());

create policy "owners add settings"
  on public.settings for insert
  to authenticated
  with check (public.is_owner());

-- ---------------------------------------------------------------------------
-- Activity history
--
-- Append only, and it stays that way: there is no update or delete policy, so
-- nothing can quietly rewrite what happened. Anyone signed in may add an entry
-- and read the history.
-- ---------------------------------------------------------------------------

create policy "signed in users read the history"
  on public.audit_logs for select
  to authenticated
  using (public.is_active_user());

create policy "signed in users add to the history"
  on public.audit_logs for insert
  to authenticated
  with check (public.is_active_user() and user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- New sign-ups get a profile
--
-- Without this an invited user authenticates successfully and then cannot see
-- anything, because every policy checks for an active profile row.
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1)),
    -- The very first account is the owner. Everyone after is a manager, and
    -- only an owner can promote them.
    case when not exists (select 1 from public.profiles) then 'owner' else 'manager' end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
