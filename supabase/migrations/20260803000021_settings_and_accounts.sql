-- Settings, and who is allowed in.
--
-- Ported from src-tauri/src/settings/repository.rs, minus everything that
-- described a file on somebody's desk.
--
-- The account change here is not a port, it is a hole being closed. The
-- publishable key ships inside the app, as it is meant to; anyone who has the
-- app has it. Until now a new sign-up became an active manager immediately,
-- which means anyone who found the address could sign up and read the whole
-- fleet. New accounts now wait for the owner to let them in, and until then
-- they can see nothing at all — every policy already requires an active
-- profile, so this needed no new rules, only a different starting state.

alter table public.profiles drop constraint if exists profiles_status_check;
alter table public.profiles add constraint profiles_status_check
  check (status in ('active', 'pending', 'inactive'));

comment on column public.profiles.status is
  'pending: signed up, waiting for an owner to let them in. active: working. inactive: switched off, keeps their history.';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  first_account boolean;
begin
  first_account := not exists (select 1 from public.profiles);

  insert into public.profiles (id, display_name, role, status)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
             split_part(new.email, '@', 1)),
    -- The very first account is the owner. Everyone after is a manager, and
    -- only an owner can promote them.
    case when first_account then 'owner' else 'manager' end,
    -- ...and everyone after waits to be let in.
    case when first_account then 'active' else 'pending' end
  );
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Exports
-- ---------------------------------------------------------------------------

-- The free plan takes no automatic backups. That makes the export the client's
-- only copy of their own records, and "when did we last take one" a question
-- the app has to be able to answer — so each export is recorded here.
create table if not exists public.data_exports (
  id uuid primary key default gen_random_uuid(),
  exported_by uuid references public.profiles(id) on delete set null,
  record_counts jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.data_exports enable row level security;

drop policy if exists "signed in users see exports" on public.data_exports;
drop policy if exists "signed in users record exports" on public.data_exports;

create policy "signed in users see exports"
  on public.data_exports for select
  to authenticated
  using (public.is_active_user());

create policy "signed in users record exports"
  on public.data_exports for insert
  to authenticated
  with check (public.is_active_user());

create index if not exists data_exports_created_at_idx
  on public.data_exports (created_at desc);

create or replace function public.record_data_export(record_counts jsonb default '{}'::jsonb)
returns timestamptz
language plpgsql
as $$
declare
  taken timestamptz;
begin
  insert into public.data_exports (exported_by, record_counts)
  values (auth.uid(), coalesce(record_data_export.record_counts, '{}'::jsonb))
  returning created_at into taken;

  return taken;
end;
$$;

create or replace function public.backup_reminder_status()
returns jsonb
language sql
stable
as $$
  with latest as (
    select max(created_at) as taken from public.data_exports
  ),
  facts as (
    select
      public.setting_bool('backup_reminder_enabled', true) as enabled,
      public.setting_int('backup_reminder_interval_days', 7) as interval_days,
      (select taken from latest) as taken,
      case when (select taken from latest) is null then null
           else (current_date - ((select taken from latest) at time zone 'UTC')::date)
      end as days_since
  )
  select jsonb_build_object(
    'enabled', enabled,
    'intervalDays', interval_days,
    'latestBackupCompletedAt', taken,
    'daysSinceLatestBackup', days_since,
    'reminderDue', enabled and (days_since is null or days_since >= interval_days),
    'message', case
      when not enabled then 'Export reminders are switched off.'
      when taken is null then
        'No export has been taken yet. The free plan keeps no automatic copies, '
        || 'so an export is the only copy of your records that you hold.'
      when days_since >= interval_days then
        'Last export was ' || days_since || ' day' || case when days_since = 1 then '' else 's' end
        || ' ago. Time for another.'
      else
        'Last export was ' || days_since || ' day' || case when days_since = 1 then '' else 's' end
        || ' ago.'
    end
  )
  from facts;
$$;

-- ---------------------------------------------------------------------------
-- Settings
-- ---------------------------------------------------------------------------

create or replace function public.app_settings()
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'preferredCurrency', coalesce((select value from public.settings where key = 'preferred_currency'), 'PHP'),
    'distanceUnit', coalesce((select value from public.settings where key = 'distance_unit'), 'km'),
    'fuelEfficiencyUnit', coalesce((select value from public.settings where key = 'fuel_efficiency_unit'), 'km_per_liter'),
    'dateDisplayPreference', coalesce((select value from public.settings where key = 'date_display_preference'), 'yyyy_mm_dd'),
    'defaultDueSoonDays', public.setting_int('default_due_soon_days', 14),
    'defaultDueSoonKm', public.setting_int('default_due_soon_km', 500),
    'includeSetupNeededSchedules', public.setting_bool('include_setup_needed_schedules', true),
    'backupReminderEnabled', public.setting_bool('backup_reminder_enabled', true),
    'backupReminderIntervalDays', public.setting_int('backup_reminder_interval_days', 7),
    'maintenanceAlertsEnabled', public.setting_bool('maintenance_alerts_enabled', true),
    'fuelEfficiencyAlertsEnabled', public.setting_bool('fuel_efficiency_alerts_enabled', true),
    'startupOnBootEnabled', public.setting_bool('startup_on_boot_enabled', false)
  );
$$;

-- The whole settings screen in one call: the values, who is signed in, and
-- when the fleet was last exported.
create or replace function public.settings_overview()
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'settings', public.app_settings(),
    'activeUser', (
      select to_jsonb(p) from public.profiles p where p.id = auth.uid()
    ),
    'backupReminder', public.backup_reminder_status()
  );
$$;

create or replace function public.update_app_settings(settings jsonb)
returns jsonb
language plpgsql
as $$
declare
  currency text;
  due_soon_days integer;
  due_soon_km integer;
  reminder_days integer;
begin
  if not public.is_owner() then
    raise exception 'Only the owner can change these settings.';
  end if;

  currency := upper(trim(coalesce(settings ->> 'preferredCurrency', '')));
  if currency !~ '^[A-Z]{3}$' then
    raise exception 'Preferred currency must be a 3-letter code such as PHP.';
  end if;

  due_soon_days := (settings ->> 'defaultDueSoonDays')::integer;
  if due_soon_days < 0 then
    raise exception 'Default due-soon days cannot be negative.';
  end if;

  due_soon_km := (settings ->> 'defaultDueSoonKm')::integer;
  if due_soon_km < 0 then
    raise exception 'Default due-soon kilometers cannot be negative.';
  end if;

  reminder_days := (settings ->> 'backupReminderIntervalDays')::integer;
  if reminder_days < 1 then
    raise exception 'Backup reminder interval must be at least 1 day.';
  end if;

  if settings ->> 'distanceUnit' not in ('km', 'mi') then
    raise exception 'Choose a valid distance unit.';
  end if;

  if settings ->> 'fuelEfficiencyUnit' not in ('km_per_liter', 'liters_per_100km') then
    raise exception 'Choose a valid fuel efficiency unit.';
  end if;

  if settings ->> 'dateDisplayPreference' not in ('yyyy_mm_dd', 'dd_mm_yyyy', 'mm_dd_yyyy') then
    raise exception 'Choose a valid date display preference.';
  end if;

  update public.settings s set value = v.value, updated_at = now()
  from (values
    ('preferred_currency', currency),
    ('distance_unit', settings ->> 'distanceUnit'),
    ('fuel_efficiency_unit', settings ->> 'fuelEfficiencyUnit'),
    ('date_display_preference', settings ->> 'dateDisplayPreference'),
    ('default_due_soon_days', due_soon_days::text),
    ('default_due_soon_km', due_soon_km::text),
    ('include_setup_needed_schedules', (settings ->> 'includeSetupNeededSchedules')::boolean::text),
    ('backup_reminder_enabled', (settings ->> 'backupReminderEnabled')::boolean::text),
    ('backup_reminder_interval_days', reminder_days::text),
    ('maintenance_alerts_enabled', (settings ->> 'maintenanceAlertsEnabled')::boolean::text),
    ('fuel_efficiency_alerts_enabled', (settings ->> 'fuelEfficiencyAlertsEnabled')::boolean::text),
    ('startup_on_boot_enabled', (settings ->> 'startupOnBootEnabled')::boolean::text)
  ) as v(key, value)
  where s.key = v.key;

  return public.settings_overview();
end;
$$;

create or replace function public.reset_app_settings()
returns jsonb
language plpgsql
as $$
begin
  if not public.is_owner() then
    raise exception 'Only the owner can reset these settings.';
  end if;

  update public.settings s set value = v.value, updated_at = now()
  from (values
    ('preferred_currency', 'PHP'),
    ('distance_unit', 'km'),
    ('fuel_efficiency_unit', 'km_per_liter'),
    ('date_display_preference', 'yyyy_mm_dd'),
    ('default_due_soon_days', '14'),
    ('default_due_soon_km', '500'),
    ('include_setup_needed_schedules', 'true'),
    ('backup_reminder_enabled', 'true'),
    ('backup_reminder_interval_days', '7'),
    ('maintenance_alerts_enabled', 'true'),
    ('fuel_efficiency_alerts_enabled', 'true'),
    ('startup_on_boot_enabled', 'false')
  ) as v(key, value)
  where s.key = v.key;

  return public.settings_overview();
end;
$$;

-- ---------------------------------------------------------------------------
-- Accounts
-- ---------------------------------------------------------------------------

create or replace function public.list_users()
returns setof public.profiles
language sql
stable
as $$
  select p.* from public.profiles p
  where p.deleted_at is null
  order by
    case p.status when 'pending' then 0 when 'active' then 1 else 2 end,
    case p.role when 'owner' then 0 when 'manager' then 1 else 2 end,
    p.display_name;
$$;

create or replace function public.update_user(
  user_id uuid,
  display_name text default null,
  role text default null,
  status text default null
)
returns public.profiles
language plpgsql
as $$
declare
  target public.profiles;
  clean_name text;
begin
  select p.* into target from public.profiles p
  where p.id = update_user.user_id and p.deleted_at is null;

  if target.id is null then
    raise exception 'That account was not found.';
  end if;

  -- Anyone may rename themselves. Everything else is the owner's.
  if not public.is_owner() then
    if target.id <> auth.uid() then
      raise exception 'Only the owner can change other people''s accounts.';
    end if;

    if (role is not null and role <> target.role)
       or (status is not null and status <> target.status) then
      raise exception 'Only the owner can change roles and access.';
    end if;
  end if;

  clean_name := coalesce(nullif(trim(coalesce(update_user.display_name, '')), ''),
                         target.display_name);

  if update_user.role is not null and update_user.role not in ('owner', 'manager', 'viewer') then
    raise exception 'Choose a valid role.';
  end if;

  if update_user.status is not null
     and update_user.status not in ('active', 'pending', 'inactive') then
    raise exception 'Choose a valid access setting.';
  end if;

  -- Somebody has to be able to let people in. Removing the last owner would
  -- lock the fleet's own account management away for good.
  if target.role = 'owner'
     and (coalesce(update_user.role, 'owner') <> 'owner'
          or coalesce(update_user.status, 'active') <> 'active')
     and not exists (
       select 1 from public.profiles p
       where p.role = 'owner' and p.status = 'active'
         and p.deleted_at is null and p.id <> target.id
     ) then
    raise exception 'There has to be one owner. Make somebody else an owner first.';
  end if;

  update public.profiles p
  set display_name = clean_name,
      role = coalesce(update_user.role, p.role),
      status = coalesce(update_user.status, p.status),
      updated_at = now()
  where p.id = update_user.user_id
  returning p.* into target;

  return target;
end;
$$;

create or replace function public.access_summary()
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'activeUser', (select to_jsonb(p) from public.profiles p where p.id = auth.uid()),
    'pendingCount', (select count(*) from public.profiles
                     where status = 'pending' and deleted_at is null),
    'roles', jsonb_build_array(
      jsonb_build_object('key', 'owner', 'label', 'Owner',
        -- Not "and exports the fleet". Anyone active can take an export, on
        -- purpose — it is the only copy of the records the client holds, and
        -- making it wait for one person is how it stops being taken.
        'description', 'Lets people in, changes settings, and restores archived records.'),
      jsonb_build_object('key', 'manager', 'label', 'Manager',
        'description', 'Records everything day to day: vehicles, trips, fuel, and service.'),
      jsonb_build_object('key', 'viewer', 'label', 'Viewer',
        'description', 'Same as a manager today. Kept so a future limit needs no migration.')
    ),
    'securityNote',
      'Everyone signs in with their own account and password. A new sign-up '
      || 'sees nothing until an owner lets them in. Data travels encrypted and '
      || 'is stored encrypted.'
  );
$$;
