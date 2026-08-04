-- The extra fields the maintenance screens read.
--
-- The desktop commands returned schedules already carrying their template key,
-- category, and a freshly evaluated due status with its explanation; settings
-- carrying the thresholds that actually apply after custom values fall back to
-- the template defaults; and templates carrying their rules nested.
--
-- Recomputing due status per row in the client would put four callers back in
-- the position of disagreeing about it, which is what moving it to Postgres
-- was meant to stop.

drop view if exists public.maintenance_schedules_detailed;
drop view if exists public.vehicle_maintenance_settings_detailed;
drop view if exists public.maintenance_logs_detailed;

create view public.maintenance_schedules_detailed as
  select
    s.*,
    t.template_key,
    t.name as template_name,
    t.category,
    v.vehicle_name,
    -- Evaluated against today, not the value stored when the row was last
    -- written. A schedule saved as "due soon" three weeks ago is overdue now,
    -- and the screen should say so without waiting for a refresh.
    (public.evaluate_due_status(
      current_date, v.current_odometer, s.next_due_date, s.next_due_odometer,
      s.due_soon_days, s.due_soon_km, s.status = 'disabled'
    )).status as due_status,
    (public.evaluate_due_status(
      current_date, v.current_odometer, s.next_due_date, s.next_due_odometer,
      s.due_soon_days, s.due_soon_km, s.status = 'disabled'
    )).reason as due_reason
  from public.maintenance_schedules s
  join public.maintenance_templates t on t.id = s.template_id
  join public.vehicles v on v.id = s.vehicle_id
  where s.deleted_at is null;

create view public.vehicle_maintenance_settings_detailed as
  select
    s.*,
    t.template_key,
    t.name as template_name,
    t.category,
    t.priority,
    -- What the reminder will actually use: the vehicle's own value if set,
    -- otherwise the item's default.
    coalesce(s.custom_due_soon_days, t.default_due_soon_days) as effective_due_soon_days,
    coalesce(s.custom_due_soon_km, t.default_due_soon_km) as effective_due_soon_km
  from public.vehicle_maintenance_settings s
  join public.maintenance_templates t on t.id = s.template_id
  where s.deleted_at is null;

create view public.maintenance_logs_detailed as
  select
    m.*,
    t.template_key,
    t.name as template_name,
    v.vehicle_name,
    receipt.storage_path as receipt_file_path,
    receipt.original_filename as receipt_original_filename,
    before_photo.storage_path as before_photo_path,
    after_photo.storage_path as after_photo_path
  from public.maintenance_logs m
  left join public.maintenance_templates t on t.id = m.template_id
  left join public.vehicles v on v.id = m.vehicle_id
  left join public.vehicle_documents receipt
    on receipt.id = m.receipt_document_id and receipt.deleted_at is null
  left join public.vehicle_photos before_photo
    on before_photo.id = m.before_photo_id and before_photo.deleted_at is null
  left join public.vehicle_photos after_photo
    on after_photo.id = m.after_photo_id and after_photo.deleted_at is null
  where m.deleted_at is null;

-- Templates with their rules nested, which is how the applicability screen
-- reads them.
create or replace view public.maintenance_templates_with_rules as
  select
    t.*,
    coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', r.id,
               'templateId', r.template_id,
               'appliesToVehicleType', r.applies_to_vehicle_type,
               'appliesToFuelType', r.applies_to_fuel_type,
               'appliesToTransmissionType', r.applies_to_transmission_type,
               'appliesToDrivetrain', r.applies_to_drivetrain,
               'requiresFeature', r.requires_feature,
               'excludesFeature', r.excludes_feature,
               'ruleType', r.rule_type,
               'notes', r.notes
             ) order by r.sort_order, r.id)
      from public.maintenance_template_rules r
      where r.template_id = t.id
    ), '[]'::jsonb) as rules
  from public.maintenance_templates t
  where t.deleted_at is null;

alter view public.maintenance_schedules_detailed set (security_invoker = on);
alter view public.vehicle_maintenance_settings_detailed set (security_invoker = on);
alter view public.maintenance_logs_detailed set (security_invoker = on);
alter view public.maintenance_templates_with_rules set (security_invoker = on);

-- ---------------------------------------------------------------------------
-- The item list, and applicability for one vehicle
-- ---------------------------------------------------------------------------

-- Seeded defaults stay out of the user's item list until something actually
-- references them; items the user created are always shown. Reproduced from
-- list_user_maintenance_templates in maintenance/repository.rs.
create or replace function public.list_user_maintenance_templates()
returns setof public.maintenance_templates_with_rules
language sql
stable
as $$
  select t.*
  from public.maintenance_templates_with_rules t
  where t.is_active
    and (
      t.template_key is null
      or exists (select 1 from public.vehicle_maintenance_settings s
                 where s.template_id = t.id and s.deleted_at is null)
      or exists (select 1 from public.maintenance_schedules m
                 where m.template_id = t.id and m.deleted_at is null)
    )
  order by t.category, t.name;
$$;

create or replace function public.applicable_templates_for_vehicle(vehicle_id uuid)
returns jsonb
language sql
stable
as $$
  select coalesce(jsonb_agg(item order by item->'template'->>'category',
                            item->'template'->>'name'), '[]'::jsonb)
  from (
    select jsonb_build_object(
             'template', to_jsonb(t),
             'applicabilityStatus', e.applicability_status,
             'isAutoApplicable', e.is_auto_applicable,
             'reason', e.reason,
             'warnings', to_jsonb(e.warnings),
             'matchedRuleIds', to_jsonb(e.matched_rule_ids)
           ) as item
    from public.maintenance_templates_with_rules t
    cross join lateral public.evaluate_template_for_vehicle(t.id, vehicle_id) e
    where t.is_active
  ) evaluated;
$$;

-- ---------------------------------------------------------------------------
-- Custom items
-- ---------------------------------------------------------------------------

-- A category is stored as a slug: "Engine & Oil" becomes "engine_oil". Ported
-- from normalize_category in maintenance/repository.rs, because two people
-- typing the same category differently would otherwise split one group in two.
create or replace function public.normalize_maintenance_category(value text)
returns text
language sql
immutable
as $$
  select nullif(
    trim(both '_' from regexp_replace(lower(coalesce(value, '')), '[^a-z0-9]+', '_', 'g')),
    ''
  );
$$;

-- The checks the desktop app ran before writing a template, with its wording.
-- Both create and update go through here so they cannot drift apart.
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
  checked.default_due_soon_days :=
    coalesce(default_due_soon_days, public.setting_int('default_due_soon_days', 14));
  checked.default_due_soon_km :=
    coalesce(default_due_soon_km, public.setting_int('default_due_soon_km', 500));

  return checked;
end;
$$;

create or replace function public.create_maintenance_template(
  name text,
  category text,
  description text default null,
  default_time_interval_days integer default null,
  default_odometer_interval_km integer default null,
  default_due_soon_days integer default null,
  default_due_soon_km integer default null,
  priority text default 'medium'
)
returns uuid
language plpgsql
as $$
declare
  checked public.maintenance_templates;
  new_id uuid;
begin
  checked := public.validated_maintenance_template(
    name, category, description,
    default_time_interval_days, default_odometer_interval_km,
    default_due_soon_days, default_due_soon_km, priority
  );

  insert into public.maintenance_templates (
    template_key, name, category, description,
    default_time_interval_days, default_odometer_interval_km,
    default_due_soon_days, default_due_soon_km, priority, is_active
  ) values (
    -- Null on purpose: a null key marks an item the user created, which
    -- re-seeding must never touch.
    null, checked.name, checked.category, checked.description,
    checked.default_time_interval_days, checked.default_odometer_interval_km,
    checked.default_due_soon_days, checked.default_due_soon_km, checked.priority, true
  )
  returning id into new_id;

  return new_id;
end;
$$;

create or replace function public.update_maintenance_template(
  template_id uuid,
  name text,
  category text,
  description text default null,
  default_time_interval_days integer default null,
  default_odometer_interval_km integer default null,
  default_due_soon_days integer default null,
  default_due_soon_km integer default null,
  priority text default 'medium'
)
returns uuid
language plpgsql
as $$
declare
  checked public.maintenance_templates;
begin
  if not exists (
    select 1 from public.maintenance_templates t
    where t.id = update_maintenance_template.template_id
      and t.is_active
      and t.deleted_at is null
  ) then
    raise exception 'Maintenance item was not found.';
  end if;

  checked := public.validated_maintenance_template(
    name, category, description,
    default_time_interval_days, default_odometer_interval_km,
    default_due_soon_days, default_due_soon_km, priority,
    update_maintenance_template.template_id
  );

  update public.maintenance_templates t
  set name = checked.name,
      category = checked.category,
      description = checked.description,
      default_time_interval_days = checked.default_time_interval_days,
      default_odometer_interval_km = checked.default_odometer_interval_km,
      default_due_soon_days = checked.default_due_soon_days,
      default_due_soon_km = checked.default_due_soon_km,
      priority = checked.priority,
      updated_at = now()
  where t.id = update_maintenance_template.template_id;

  return update_maintenance_template.template_id;
end;
$$;

-- Archiving takes the item out of circulation along with everything that
-- depends on it, rather than deleting history that references it.
create or replace function public.archive_maintenance_template(template_id uuid)
returns void
language plpgsql
as $$
declare
  schedule record;
begin
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
