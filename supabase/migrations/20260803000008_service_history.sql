-- Recording completed maintenance.
--
-- Ported from src-tauri/src/maintenance/service_history.rs:89. One call does
-- six things across four tables, and either all of them happen or none do —
-- which is the whole reason this is a database function rather than a handful
-- of requests from the browser. Half of this applied would leave a vehicle
-- with a service record and no updated reminder.

-- An attachment has to belong to the vehicle it is being attached to.
-- Otherwise a receipt from one van ends up filed against another.
create or replace function public.assert_attachment_belongs_to_vehicle(
  attachment_id uuid,
  vehicle_id uuid,
  source_table text,
  label text
)
returns void
language plpgsql
stable
as $$
declare
  owner uuid;
begin
  if attachment_id is null then
    return;
  end if;

  if source_table = 'vehicle_documents' then
    select d.vehicle_id into owner from public.vehicle_documents d
    where d.id = attachment_id and d.deleted_at is null;
  else
    select p.vehicle_id into owner from public.vehicle_photos p
    where p.id = attachment_id and p.deleted_at is null;
  end if;

  if owner is null or owner is distinct from vehicle_id then
    raise exception 'The selected % does not belong to this vehicle.', label;
  end if;
end;
$$;

create type public.maintenance_completion as (
  log_id uuid,
  schedule_id uuid,
  resolved_alert_count integer,
  reminder_used boolean
);

-- ---------------------------------------------------------------------------
-- Completing a scheduled reminder
-- ---------------------------------------------------------------------------

create or replace function public.complete_maintenance_schedule(
  schedule_id uuid,
  completed_date date,
  odometer numeric default null,
  work_performed text default '',
  parts_replaced text default null,
  labor_cost numeric default 0,
  parts_cost numeric default 0,
  total_cost numeric default null,
  mechanic_shop text default null,
  receipt_document_id uuid default null,
  before_photo_id uuid default null,
  after_photo_id uuid default null,
  warranty_expiration date default null,
  notes text default null
)
returns public.maintenance_completion
language plpgsql
as $$
declare
  context record;
  completion_odometer numeric;
  interval_days integer;
  interval_km integer;
  -- Not named next_due_date/next_due_odometer: a local of that name cannot be
  -- qualified, and unqualified it is ambiguous against the column.
  computed_next_due_date date;
  computed_next_due_odometer numeric;
  new_status text;
  log_id uuid;
  resolved integer;
  final_total numeric;
begin
  select s.id, s.vehicle_id, s.template_id, s.status, s.due_soon_days, s.due_soon_km,
         s.last_completed_odometer, v.current_odometer,
         setting.custom_time_interval_days, setting.custom_odometer_interval_km
  into context
  from public.maintenance_schedules s
  join public.vehicles v on v.id = s.vehicle_id and v.deleted_at is null
  left join public.vehicle_maintenance_settings setting
    on setting.id = s.vehicle_maintenance_setting_id
   and setting.deleted_at is null
   and setting.status = 'active'
  where s.id = complete_maintenance_schedule.schedule_id
    and s.deleted_at is null;

  if context.id is null then
    raise exception 'Maintenance schedule was not found.';
  end if;

  completion_odometer := coalesce(odometer, context.current_odometer);

  -- Work cannot have been done at a lower reading than the last time it was
  -- done. The message repeats the previous value, because "that is too low" on
  -- its own leaves somebody guessing.
  if context.last_completed_odometer is not null
     and completion_odometer < context.last_completed_odometer then
    raise exception
      'Completion odometer cannot be lower than the previous completed odometer (% km).',
      to_char(context.last_completed_odometer, 'FM999999999990');
  end if;

  perform public.assert_attachment_belongs_to_vehicle(
    receipt_document_id, context.vehicle_id, 'vehicle_documents', 'maintenance receipt');
  perform public.assert_attachment_belongs_to_vehicle(
    before_photo_id, context.vehicle_id, 'vehicle_photos', 'before photo');
  perform public.assert_attachment_belongs_to_vehicle(
    after_photo_id, context.vehicle_id, 'vehicle_photos', 'after photo');

  -- Intervals come from the vehicle's own setting, not the template default.
  interval_days := context.custom_time_interval_days;
  interval_km := context.custom_odometer_interval_km;

  if interval_days is not null then
    computed_next_due_date := completed_date + interval_days;
  end if;
  if interval_km is not null then
    computed_next_due_odometer := completion_odometer + interval_km;
  end if;

  final_total := coalesce(total_cost, coalesce(labor_cost, 0) + coalesce(parts_cost, 0));

  insert into public.maintenance_logs (
    vehicle_id, template_id, schedule_id, completed_date, odometer,
    work_performed, parts_replaced, labor_cost, parts_cost, total_cost,
    mechanic_shop, receipt_document_id, before_photo_id, after_photo_id,
    warranty_expiration, next_recommended_date, next_recommended_odometer, notes,
    created_by, updated_by
  ) values (
    context.vehicle_id, context.template_id, complete_maintenance_schedule.schedule_id,
    completed_date, completion_odometer, work_performed, parts_replaced,
    coalesce(labor_cost, 0), coalesce(parts_cost, 0), final_total,
    mechanic_shop, receipt_document_id, before_photo_id, after_photo_id,
    warranty_expiration, computed_next_due_date, computed_next_due_odometer, notes,
    auth.uid(), auth.uid()
  )
  returning id into log_id;

  -- The status is judged against whichever reading is higher: the vehicle's
  -- current one or the one the work was done at.
  new_status := (public.evaluate_due_status(
    completed_date,
    greatest(context.current_odometer, completion_odometer),
    computed_next_due_date, computed_next_due_odometer,
    context.due_soon_days, context.due_soon_km,
    context.status = 'disabled'
  )).status;

  update public.maintenance_schedules
  set last_completed_date = completed_date,
      last_completed_odometer = completion_odometer,
      next_due_date = computed_next_due_date,
      next_due_odometer = computed_next_due_odometer,
      status = new_status,
      notes = null
  where id = complete_maintenance_schedule.schedule_id;

  -- The odometer only ever goes up.
  update public.vehicles
  set current_odometer = completion_odometer
  where id = context.vehicle_id
    and current_odometer < completion_odometer
    and deleted_at is null;

  if receipt_document_id is not null then
    update public.vehicle_documents
    set related_record_type = 'maintenance_log', related_record_id = log_id
    where id = receipt_document_id;
  end if;

  -- Finishing the work clears every maintenance alert for it, whatever the
  -- reason each was raised for.
  resolved := public.resolve_stale_schedule_alerts(complete_maintenance_schedule.schedule_id, null);

  return row(log_id, complete_maintenance_schedule.schedule_id, resolved, true)
    ::public.maintenance_completion;
end;
$$;

-- ---------------------------------------------------------------------------
-- Logging work that may or may not have a reminder behind it
-- ---------------------------------------------------------------------------

create or replace function public.log_maintenance(
  vehicle_id uuid,
  template_id uuid,
  completed_date date,
  odometer numeric default null,
  work_performed text default '',
  parts_replaced text default null,
  labor_cost numeric default 0,
  parts_cost numeric default 0,
  total_cost numeric default null,
  mechanic_shop text default null,
  receipt_document_id uuid default null,
  before_photo_id uuid default null,
  after_photo_id uuid default null,
  warranty_expiration date default null,
  notes text default null
)
returns public.maintenance_completion
language plpgsql
as $$
declare
  -- Not named current_odometer: ambiguous against the column of that name.
  vehicle_odometer numeric;
  completion_odometer numeric;
  previous_odometer numeric;
  existing_schedule uuid;
  log_id uuid;
  final_total numeric;
begin
  select v.current_odometer into vehicle_odometer
  from public.vehicles v
  where v.id = log_maintenance.vehicle_id and v.deleted_at is null;

  if vehicle_odometer is null then
    raise exception 'Vehicle was not found.';
  end if;

  if not exists (select 1 from public.maintenance_templates t
                 where t.id = log_maintenance.template_id and t.deleted_at is null) then
    raise exception 'Maintenance item was not found.';
  end if;

  completion_odometer := coalesce(odometer, vehicle_odometer);

  select m.odometer into previous_odometer
  from public.maintenance_logs m
  where m.vehicle_id = log_maintenance.vehicle_id
    and m.template_id = log_maintenance.template_id
    and m.deleted_at is null
  order by m.completed_date desc, m.created_at desc
  limit 1;

  if previous_odometer is not null and completion_odometer < previous_odometer then
    raise exception
      'Completion odometer cannot be lower than the previous completed odometer (% km).',
      to_char(previous_odometer, 'FM999999999990');
  end if;

  -- If this vehicle has a live reminder for this item, completing it keeps the
  -- reminder in step. Otherwise the work is recorded on its own and nothing is
  -- scheduled — which is the whole point of being able to log ad-hoc work.
  select s.id into existing_schedule
  from public.maintenance_schedules s
  join public.vehicle_maintenance_settings setting
    on setting.id = s.vehicle_maintenance_setting_id
   and setting.deleted_at is null
   and setting.status = 'active'
  where s.vehicle_id = log_maintenance.vehicle_id
    and s.template_id = log_maintenance.template_id
    and s.deleted_at is null
    and s.archived_at is null
  limit 1;

  if existing_schedule is not null then
    return public.complete_maintenance_schedule(
      existing_schedule, completed_date, completion_odometer, work_performed,
      parts_replaced, labor_cost, parts_cost, total_cost, mechanic_shop,
      receipt_document_id, before_photo_id, after_photo_id, warranty_expiration, notes
    );
  end if;

  perform public.assert_attachment_belongs_to_vehicle(
    receipt_document_id, log_maintenance.vehicle_id, 'vehicle_documents', 'maintenance receipt');
  perform public.assert_attachment_belongs_to_vehicle(
    before_photo_id, log_maintenance.vehicle_id, 'vehicle_photos', 'before photo');
  perform public.assert_attachment_belongs_to_vehicle(
    after_photo_id, log_maintenance.vehicle_id, 'vehicle_photos', 'after photo');

  final_total := coalesce(total_cost, coalesce(labor_cost, 0) + coalesce(parts_cost, 0));

  insert into public.maintenance_logs (
    vehicle_id, template_id, completed_date, odometer, work_performed,
    parts_replaced, labor_cost, parts_cost, total_cost, mechanic_shop,
    receipt_document_id, before_photo_id, after_photo_id, warranty_expiration, notes,
    created_by, updated_by
  ) values (
    log_maintenance.vehicle_id, log_maintenance.template_id, completed_date,
    completion_odometer, work_performed, parts_replaced,
    coalesce(labor_cost, 0), coalesce(parts_cost, 0), final_total, mechanic_shop,
    receipt_document_id, before_photo_id, after_photo_id, warranty_expiration, notes,
    auth.uid(), auth.uid()
  )
  returning id into log_id;

  update public.vehicles
  set current_odometer = completion_odometer
  where id = log_maintenance.vehicle_id
    and current_odometer < completion_odometer
    and deleted_at is null;

  if receipt_document_id is not null then
    update public.vehicle_documents
    set related_record_type = 'maintenance_log', related_record_id = log_id
    where id = receipt_document_id;
  end if;

  return row(log_id, null::uuid, 0, false)::public.maintenance_completion;
end;
$$;
