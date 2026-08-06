-- A warn window cannot be as long as the interval it warns about.
--
-- The client reported an item reading "Due Soon" with "Due in 3583 days." next
-- to a next-due date in 2036. Both are true at once: evaluate_due_status calls
-- anything within due_soon_days of its date due soon, and that row's warn
-- window is its whole 3,600-day interval. So the item was due soon from the
-- moment it was logged and would stay that way for a decade — the badge that
-- is supposed to mean "see to this shortly" pinned on for ever.
--
-- Nothing in the current app writes such a value: the reminder form never
-- sends one and the server falls back to `default_due_soon_days`, 14. It
-- arrived with the data, which migrate_from_backup.py copies across verbatim.
--
-- Three parts: stop it being written, stop it being derived, and correct what
-- is already stored.

-- ---------------------------------------------------------------------------
-- The rule
-- ---------------------------------------------------------------------------

-- A window at or beyond its interval falls back to the supplied default, and
-- if even that does not fit — a three-day interval — to one unit short of the
-- interval, which is the longest warning that still leaves a stretch where the
-- item is simply not due.
create or replace function public.fitted_warn_window(
  window_size integer,
  interval_size integer,
  fallback integer
)
returns integer
language sql
immutable
as $$
  select case
    when window_size is null then null
    when interval_size is null or window_size < interval_size then greatest(window_size, 0)
    else least(greatest(fallback, 0), greatest(interval_size - 1, 0))
  end;
$$;

comment on function public.fitted_warn_window is
  'Keeps a due-soon window shorter than the interval it warns about. A window as long as the interval leaves a reminder permanently due soon.';

-- ---------------------------------------------------------------------------
-- Writing one
-- ---------------------------------------------------------------------------

-- Unchanged except for the two interval checks. A value the caller supplied is
-- refused, because they asked for something that cannot mean what they think.
-- A value that merely fell back to the default is clamped instead: a seven-day
-- interval against the standard fourteen-day warning is the system's mismatch
-- to resolve, not the user's mistake to be blocked by.
create or replace function public.validated_maintenance_template(
  name text,
  category text,
  description text,
  default_time_interval_days integer,
  default_odometer_interval_km integer,
  default_due_soon_days integer,
  default_due_soon_km integer,
  priority text,
  except_template_id uuid default null
)
returns public.maintenance_templates
language plpgsql
stable
as $$
declare
  checked public.maintenance_templates;
begin
  checked.name := nullif(trim(coalesce(name, '')), '');
  if checked.name is null then
    raise exception 'Maintenance item name is required.';
  end if;

  checked.category := public.normalize_maintenance_category(category);
  if checked.category is null then
    raise exception 'Maintenance item category is required.';
  end if;

  if default_time_interval_days is not null and default_time_interval_days <= 0 then
    raise exception 'Default day interval must be greater than zero.';
  end if;

  if default_odometer_interval_km is not null and default_odometer_interval_km <= 0 then
    raise exception 'Default km interval must be greater than zero.';
  end if;

  if default_due_soon_days is not null and default_due_soon_days < 0 then
    raise exception 'Default warn days cannot be negative.';
  end if;

  if default_due_soon_km is not null and default_due_soon_km < 0 then
    raise exception 'Default warn km cannot be negative.';
  end if;

  if default_due_soon_days is not null and default_time_interval_days is not null
     and default_due_soon_days >= default_time_interval_days then
    raise exception
      'Warn days must be shorter than the day interval, or the item is due soon from the day it is logged.';
  end if;

  if default_due_soon_km is not null and default_odometer_interval_km is not null
     and default_due_soon_km >= default_odometer_interval_km then
    raise exception
      'Warn km must be shorter than the km interval, or the item is due soon from the day it is logged.';
  end if;

  checked.priority := nullif(trim(lower(coalesce(priority, ''))), '');
  checked.priority := coalesce(checked.priority, 'medium');
  if checked.priority not in ('low', 'medium', 'high', 'critical') then
    raise exception 'Choose a valid maintenance item priority.';
  end if;

  -- Only items the user created are checked for a clashing name. The seeded
  -- defaults are allowed to share a name with something somebody typed in,
  -- which is how the client's own list already looks.
  if exists (
    select 1 from public.maintenance_templates t
    where lower(t.name) = lower(checked.name)
      and t.is_active
      and t.deleted_at is null
      and t.template_key is null
      and (except_template_id is null or t.id <> except_template_id)
  ) then
    raise exception 'A maintenance item with this name already exists.';
  end if;

  checked.description := nullif(trim(coalesce(description, '')), '');
  checked.default_time_interval_days := default_time_interval_days;
  checked.default_odometer_interval_km := default_odometer_interval_km;
  checked.default_due_soon_days := public.fitted_warn_window(
    coalesce(default_due_soon_days, public.setting_int('default_due_soon_days', 14)),
    default_time_interval_days,
    public.setting_int('default_due_soon_days', 14)
  );
  checked.default_due_soon_km := public.fitted_warn_window(
    coalesce(default_due_soon_km, public.setting_int('default_due_soon_km', 500)),
    default_odometer_interval_km,
    public.setting_int('default_due_soon_km', 500)
  );

  return checked;
end;
$$;

-- ---------------------------------------------------------------------------
-- Deriving one
-- ---------------------------------------------------------------------------

create or replace function public.upsert_vehicle_maintenance_setting(
  vehicle_id uuid,
  template_id uuid,
  status text default 'active',
  custom_time_interval_days integer default null,
  custom_odometer_interval_km integer default null,
  custom_due_soon_days integer default null,
  custom_due_soon_km integer default null,
  notes text default null
)
returns uuid
language plpgsql
as $$
declare
  vehicle record;
  setting_id uuid;
  due_soon_days integer;
  due_soon_km integer;
begin
  select v.id, v.status, v.archived_at into vehicle
  from public.vehicles v
  where v.id = upsert_vehicle_maintenance_setting.vehicle_id and v.deleted_at is null;

  if vehicle.id is null then
    raise exception 'Vehicle was not found.';
  end if;

  if vehicle.status = 'archived' or vehicle.archived_at is not null then
    raise exception 'Archived vehicles cannot receive new maintenance reminders.';
  end if;

  if not exists (select 1 from public.maintenance_templates t
                 where t.id = upsert_vehicle_maintenance_setting.template_id
                   and t.deleted_at is null) then
    raise exception 'Maintenance item was not found.';
  end if;

  -- A reminder that is switched on but has neither interval would never
  -- become due, which is a quieter kind of broken than an error.
  if status in ('active', 'manually_added')
     and custom_time_interval_days is null
     and custom_odometer_interval_km is null then
    raise exception
      'Set at least one reminder interval, such as every 90 days or every 5,000 km.';
  end if;

  -- Asked for explicitly, so say no rather than quietly storing something else.
  if custom_due_soon_days is not null and custom_time_interval_days is not null
     and custom_due_soon_days >= custom_time_interval_days then
    raise exception
      'Warn days must be shorter than the day interval, or the reminder is due soon from the day it is set.';
  end if;

  if custom_due_soon_km is not null and custom_odometer_interval_km is not null
     and custom_due_soon_km >= custom_odometer_interval_km then
    raise exception
      'Warn km must be shorter than the km interval, or the reminder is due soon from the day it is set.';
  end if;

  due_soon_days := public.fitted_warn_window(
    coalesce(custom_due_soon_days, public.setting_int('default_due_soon_days', 14)),
    custom_time_interval_days,
    public.setting_int('default_due_soon_days', 14)
  );
  due_soon_km := public.fitted_warn_window(
    coalesce(custom_due_soon_km, public.setting_int('default_due_soon_km', 500)),
    custom_odometer_interval_km,
    public.setting_int('default_due_soon_km', 500)
  );

  -- Update-then-insert rather than ON CONFLICT: the conflict target would
  -- name columns that collide with this function's parameters, and Postgres
  -- cannot tell which is meant.
  select s.id into setting_id
  from public.vehicle_maintenance_settings s
  where s.vehicle_id = upsert_vehicle_maintenance_setting.vehicle_id
    and s.template_id = upsert_vehicle_maintenance_setting.template_id
  limit 1;

  if setting_id is not null then
    update public.vehicle_maintenance_settings s
    set status = upsert_vehicle_maintenance_setting.status,
        custom_time_interval_days =
          upsert_vehicle_maintenance_setting.custom_time_interval_days,
        custom_odometer_interval_km =
          upsert_vehicle_maintenance_setting.custom_odometer_interval_km,
        custom_due_soon_days = due_soon_days,
        custom_due_soon_km = due_soon_km,
        notes = upsert_vehicle_maintenance_setting.notes,
        -- Re-adding a reminder somebody removed brings it back rather than
        -- refusing because a deleted row is in the way.
        deleted_at = null
    where s.id = setting_id;
  else
    insert into public.vehicle_maintenance_settings (
      vehicle_id, template_id, status,
      custom_time_interval_days, custom_odometer_interval_km,
      custom_due_soon_days, custom_due_soon_km, notes
    ) values (
      upsert_vehicle_maintenance_setting.vehicle_id,
      upsert_vehicle_maintenance_setting.template_id,
      upsert_vehicle_maintenance_setting.status,
      upsert_vehicle_maintenance_setting.custom_time_interval_days,
      upsert_vehicle_maintenance_setting.custom_odometer_interval_km,
      due_soon_days, due_soon_km, upsert_vehicle_maintenance_setting.notes
    )
    returning id into setting_id;
  end if;

  perform public.recalculate_schedule_for_setting(setting_id);

  return setting_id;
end;
$$;

-- The schedule inherits the setting's window, so it is clamped here too: a
-- reminder whose stored value predates this migration must not carry the fault
-- forward the next time anything touches it.
create or replace function public.recalculate_schedule_for_setting(
  setting_id uuid,
  completed_date date default null,
  completed_odometer numeric default null
)
returns uuid
language plpgsql
as $$
declare
  setting record;
  base_date date;
  base_odometer numeric;
  warn_days integer;
  warn_km integer;
  computed_next_due_date date;
  computed_next_due_odometer numeric;
  computed_status text;
  setup_note text;
  existing_schedule uuid;
begin
  select s.id, s.vehicle_id, s.template_id, s.status,
         s.custom_time_interval_days, s.custom_odometer_interval_km,
         coalesce(s.custom_due_soon_days, t.default_due_soon_days) as due_soon_days,
         coalesce(s.custom_due_soon_km, t.default_due_soon_km) as due_soon_km,
         t.priority, v.current_odometer
  into setting
  from public.vehicle_maintenance_settings s
  join public.maintenance_templates t on t.id = s.template_id
  join public.vehicles v on v.id = s.vehicle_id
  where s.id = recalculate_schedule_for_setting.setting_id;

  if setting.id is null then
    return null;
  end if;

  warn_days := public.fitted_warn_window(
    setting.due_soon_days, setting.custom_time_interval_days,
    public.setting_int('default_due_soon_days', 14)
  );
  warn_km := public.fitted_warn_window(
    setting.due_soon_km, setting.custom_odometer_interval_km,
    public.setting_int('default_due_soon_km', 500)
  );

  base_date := coalesce(completed_date, current_date);
  base_odometer := coalesce(completed_odometer, setting.current_odometer);

  if setting.custom_time_interval_days is not null then
    computed_next_due_date := base_date + setting.custom_time_interval_days;
  end if;
  if setting.custom_odometer_interval_km is not null then
    computed_next_due_odometer := base_odometer + setting.custom_odometer_interval_km;
  end if;

  computed_status := (public.evaluate_due_status(
    base_date,
    greatest(setting.current_odometer, base_odometer),
    computed_next_due_date, computed_next_due_odometer,
    warn_days, warn_km,
    setting.status = 'disabled'
  )).status;

  -- A reminder with no interval at all is not broken, it is unfinished, and
  -- the note says so on the screen rather than leaving a blank row.
  if computed_next_due_date is null and computed_next_due_odometer is null then
    setup_note := 'No reminder interval is set yet.';
  end if;

  select id into existing_schedule
  from public.maintenance_schedules
  where vehicle_id = setting.vehicle_id
    and template_id = setting.template_id
    and deleted_at is null
  limit 1;

  if existing_schedule is not null then
    update public.maintenance_schedules
    set vehicle_maintenance_setting_id = setting.id,
        next_due_date = computed_next_due_date,
        next_due_odometer = computed_next_due_odometer,
        due_soon_days = warn_days,
        due_soon_km = warn_km,
        status = computed_status,
        priority = setting.priority,
        notes = setup_note,
        archived_at = null
    where id = existing_schedule;
    return existing_schedule;
  end if;

  insert into public.maintenance_schedules (
    vehicle_id, template_id, vehicle_maintenance_setting_id,
    next_due_date, next_due_odometer, due_soon_days, due_soon_km,
    status, priority, notes
  ) values (
    setting.vehicle_id, setting.template_id, setting.id,
    computed_next_due_date, computed_next_due_odometer,
    warn_days, warn_km,
    computed_status, setting.priority, setup_note
  )
  returning id into existing_schedule;

  return existing_schedule;
end;
$$;

-- ---------------------------------------------------------------------------
-- The rule, enforced by the table rather than by whoever writes to it
-- ---------------------------------------------------------------------------
--
-- The functions above cover the app. They do not cover migrate_from_backup.py,
-- which inserts straight through PostgREST — so importing the client's real
-- records on go-live day would bring these values back, along with any others
-- the desktop app wrote the same way, and the correction below would be undone
-- by the very thing it was written for.
--
-- A trigger holds however the row arrives.

create or replace function public.fit_warn_window_to_interval()
returns trigger
language plpgsql
as $$
declare
  interval_days integer;
  interval_km integer;
begin
  if tg_table_name = 'maintenance_schedules' then
    -- A schedule does not carry its own interval, so it borrows the one it was
    -- derived from. The importer writes settings before schedules, so this is
    -- there to be read.
    select coalesce(s.custom_time_interval_days, t.default_time_interval_days),
           coalesce(s.custom_odometer_interval_km, t.default_odometer_interval_km)
    into interval_days, interval_km
    from public.maintenance_templates t
    left join public.vehicle_maintenance_settings s
      on s.id = new.vehicle_maintenance_setting_id
    where t.id = new.template_id;

    new.due_soon_days := public.fitted_warn_window(
      new.due_soon_days, interval_days, public.setting_int('default_due_soon_days', 14));
    new.due_soon_km := public.fitted_warn_window(
      new.due_soon_km, interval_km, public.setting_int('default_due_soon_km', 500));

    return new;
  end if;

  if tg_table_name = 'maintenance_templates' then
    new.default_due_soon_days := public.fitted_warn_window(
      new.default_due_soon_days, new.default_time_interval_days,
      public.setting_int('default_due_soon_days', 14));
    new.default_due_soon_km := public.fitted_warn_window(
      new.default_due_soon_km, new.default_odometer_interval_km,
      public.setting_int('default_due_soon_km', 500));
  else
    new.custom_due_soon_days := public.fitted_warn_window(
      new.custom_due_soon_days, new.custom_time_interval_days,
      public.setting_int('default_due_soon_days', 14));
    new.custom_due_soon_km := public.fitted_warn_window(
      new.custom_due_soon_km, new.custom_odometer_interval_km,
      public.setting_int('default_due_soon_km', 500));
  end if;

  return new;
end;
$$;

drop trigger if exists fit_warn_window on public.maintenance_templates;
drop trigger if exists fit_warn_window on public.vehicle_maintenance_settings;
drop trigger if exists fit_warn_window on public.maintenance_schedules;

create trigger fit_warn_window
  before insert or update on public.maintenance_templates
  for each row
  execute function public.fit_warn_window_to_interval();

create trigger fit_warn_window
  before insert or update on public.vehicle_maintenance_settings
  for each row
  execute function public.fit_warn_window_to_interval();

-- The importer writes schedules directly too, carrying whatever the desktop
-- app stored on each one.
create trigger fit_warn_window
  before insert or update on public.maintenance_schedules
  for each row
  execute function public.fit_warn_window_to_interval();

-- ---------------------------------------------------------------------------
-- Correcting what is already stored
-- ---------------------------------------------------------------------------
--
-- Deliberately not done by calling recalculate_schedule_for_setting: that
-- recomputes the next due date from today, which would push every reminder in
-- the fleet forward by a full interval and lose when work is actually due. The
-- windows are corrected in place and only the status is re-evaluated.
do $$
declare
  fixed_templates integer;
  fixed_settings integer;
  fixed_schedules integer;
begin
  update public.maintenance_templates t
  set default_due_soon_days = public.fitted_warn_window(
        t.default_due_soon_days, t.default_time_interval_days,
        public.setting_int('default_due_soon_days', 14)),
      default_due_soon_km = public.fitted_warn_window(
        t.default_due_soon_km, t.default_odometer_interval_km,
        public.setting_int('default_due_soon_km', 500))
  where (t.default_time_interval_days is not null
         and t.default_due_soon_days >= t.default_time_interval_days)
     or (t.default_odometer_interval_km is not null
         and t.default_due_soon_km >= t.default_odometer_interval_km);

  get diagnostics fixed_templates = row_count;

  update public.vehicle_maintenance_settings s
  set custom_due_soon_days = public.fitted_warn_window(
        s.custom_due_soon_days, s.custom_time_interval_days,
        public.setting_int('default_due_soon_days', 14)),
      custom_due_soon_km = public.fitted_warn_window(
        s.custom_due_soon_km, s.custom_odometer_interval_km,
        public.setting_int('default_due_soon_km', 500))
  where (s.custom_time_interval_days is not null
         and s.custom_due_soon_days >= s.custom_time_interval_days)
     or (s.custom_odometer_interval_km is not null
         and s.custom_due_soon_km >= s.custom_odometer_interval_km);

  get diagnostics fixed_settings = row_count;

  -- Schedules take whatever the corrected setting and item now say.
  update public.maintenance_schedules m
  set due_soon_days = effective.days,
      due_soon_km = effective.km
  from (
    select m2.id,
           coalesce(s.custom_due_soon_days, t.default_due_soon_days) as days,
           coalesce(s.custom_due_soon_km, t.default_due_soon_km) as km
    from public.maintenance_schedules m2
    join public.maintenance_templates t on t.id = m2.template_id
    left join public.vehicle_maintenance_settings s
      on s.vehicle_id = m2.vehicle_id
     and s.template_id = m2.template_id
     and s.deleted_at is null
    where m2.deleted_at is null
  ) effective
  where effective.id = m.id
    and (m.due_soon_days is distinct from effective.days
         or m.due_soon_km is distinct from effective.km);

  get diagnostics fixed_schedules = row_count;

  -- The stored status is what the dashboard counts from, so it has to agree
  -- with the corrected window. next_due_date and next_due_odometer are read,
  -- never written.
  update public.maintenance_schedules m
  set status = (public.evaluate_due_status(
        current_date, v.current_odometer, m.next_due_date, m.next_due_odometer,
        m.due_soon_days, m.due_soon_km, m.status = 'disabled'
      )).status
  from public.vehicles v
  where v.id = m.vehicle_id
    and m.deleted_at is null
    and v.deleted_at is null;

  raise notice 'warn windows corrected: % items, % reminders, % schedules',
    fixed_templates, fixed_settings, fixed_schedules;
end $$;

-- Alerts were raised against the old status, so anything now sitting at
-- not_due needs its due-soon alert withdrawn.
select public.refresh_maintenance_alerts_for_all_vehicles();
