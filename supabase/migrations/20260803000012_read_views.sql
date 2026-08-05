-- Flat read views.
--
-- The desktop app's commands returned records with their joins already
-- resolved: a fuel log arrived carrying the vehicle name and the receipt path,
-- a trip carrying its drivers as a list of names. Every screen in the app is
-- written against those shapes.
--
-- PostgREST returns nested objects instead. Reshaping in the browser would
-- mean twenty hand-written mappers that drift from the types in silence, and
-- changing the screens would mean touching all 73 call sites — which is
-- exactly what keeping one seam was meant to avoid. So the flattening happens
-- here, where it can be tested alongside everything else.
--
-- Column names stay snake_case; the client converts once on the way through.

-- ---------------------------------------------------------------------------
-- Vehicles
-- ---------------------------------------------------------------------------

create or replace view public.vehicles_with_photo as
  select
    v.*,
    p.storage_path as primary_photo_path,
    p.mime_type as primary_photo_mime_type
  from public.vehicles v
  left join public.vehicle_photos p
    on p.id = v.primary_photo_id and p.deleted_at is null
  where v.deleted_at is null;

-- ---------------------------------------------------------------------------
-- Fuel
--
-- efficiency_reason and the fuel-type warnings were computed in Rust on the
-- way out. They are explanations shown next to each log, so they belong with
-- the row rather than being recomputed in two clients.
-- ---------------------------------------------------------------------------

create or replace function public.fuel_type_is_compatible(
  vehicle_fuel_type text,
  fuel_type text
)
returns boolean
language sql
immutable
as $$
  select case vehicle_fuel_type
    when 'gasoline' then fuel_type = 'gasoline'
    when 'diesel' then fuel_type in ('diesel', 'def_adblue')
    when 'hybrid_gasoline' then fuel_type in ('hybrid_gasoline', 'gasoline')
    when 'hybrid_diesel' then fuel_type in ('hybrid_diesel', 'diesel', 'def_adblue')
    when 'full_ev' then fuel_type = 'full_ev'
    when 'other' then true
    else vehicle_fuel_type = fuel_type
  end;
$$;

create or replace function public.efficiency_reason(
  status text,
  fuel_type text,
  is_full_tank boolean
)
returns text
language sql
immutable
as $$
  select case
    when fuel_type = 'def_adblue'
      then 'DEF/AdBlue is not counted as diesel fuel consumption.'
    when not is_full_tank
      then 'Partial tank saved; official fuel efficiency waits for full-tank entries.'
    when status = 'official'
      then 'Calculated between consecutive full-tank fuel logs.'
    else 'Waiting for another valid full-tank fuel log before calculating official efficiency.'
  end;
$$;

create or replace view public.fuel_logs_detailed as
  select
    f.*,
    v.vehicle_name,
    d.storage_path as receipt_file_path,
    d.original_filename as receipt_original_filename,
    public.efficiency_reason(f.efficiency_status, f.fuel_type, f.is_full_tank)
      as efficiency_reason,
    (
      select coalesce(jsonb_agg(warning), '[]'::jsonb)
      from (
        select jsonb_build_object(
                 'code', 'def_adblue_not_fuel',
                 'severity', 'warning',
                 'message', 'DEF/AdBlue is saved as a fluid entry and is not counted as diesel fuel consumption.'
               ) as warning
        where f.fuel_type = 'def_adblue'
        union all
        select jsonb_build_object(
                 'code', 'fuel_type_mismatch',
                 'severity', 'warning',
                 'message', 'Fuel type does not match the selected vehicle. Confirm before saving.'
               )
        where not public.fuel_type_is_compatible(v.fuel_type, f.fuel_type)
      ) w
    ) as warnings
  from public.fuel_logs f
  left join public.vehicles v on v.id = f.vehicle_id
  left join public.vehicle_documents d
    on d.id = f.receipt_document_id and d.deleted_at is null
  where f.deleted_at is null;

-- ---------------------------------------------------------------------------
-- Maintenance
-- ---------------------------------------------------------------------------

create or replace view public.maintenance_schedules_detailed as
  select
    s.*,
    t.name as template_name,
    t.category as template_category,
    v.vehicle_name
  from public.maintenance_schedules s
  join public.maintenance_templates t on t.id = s.template_id
  join public.vehicles v on v.id = s.vehicle_id
  where s.deleted_at is null;

create or replace view public.maintenance_logs_detailed as
  select
    m.*,
    t.name as template_name,
    v.vehicle_name,
    receipt.storage_path as receipt_file_path,
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

create or replace view public.vehicle_maintenance_settings_detailed as
  select
    s.*,
    t.name as template_name,
    t.category as template_category,
    t.priority as template_priority
  from public.vehicle_maintenance_settings s
  join public.maintenance_templates t on t.id = s.template_id
  where s.deleted_at is null;

-- ---------------------------------------------------------------------------
-- Expenses and alerts
-- ---------------------------------------------------------------------------

create or replace view public.expenses_detailed as
  select
    e.*,
    v.vehicle_name,
    d.storage_path as receipt_file_path
  from public.expenses e
  left join public.vehicles v on v.id = e.vehicle_id
  left join public.vehicle_documents d
    on d.id = e.receipt_document_id and d.deleted_at is null
  where e.deleted_at is null;

create or replace view public.alerts_detailed as
  select
    a.*,
    v.vehicle_name,
    t.name as template_name
  from public.alerts a
  left join public.vehicles v on v.id = a.vehicle_id
  left join public.maintenance_schedules s on s.id = a.maintenance_schedule_id
  left join public.maintenance_templates t on t.id = s.template_id
  where a.deleted_at is null;

-- Views run as their owner, so they would bypass the policies on the tables
-- underneath. security_invoker makes them respect the caller's permissions
-- instead — without it, every one of these would be a hole straight through
-- row level security.
alter view public.vehicles_with_photo set (security_invoker = on);
alter view public.fuel_logs_detailed set (security_invoker = on);
alter view public.maintenance_schedules_detailed set (security_invoker = on);
alter view public.maintenance_logs_detailed set (security_invoker = on);
alter view public.vehicle_maintenance_settings_detailed set (security_invoker = on);
alter view public.expenses_detailed set (security_invoker = on);
alter view public.alerts_detailed set (security_invoker = on);
alter view public.trips_with_people set (security_invoker = on);
alter view public.cost_events set (security_invoker = on);
alter view public.standalone_expenses set (security_invoker = on);
