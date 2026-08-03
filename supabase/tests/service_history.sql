-- Recording completed maintenance.
--
-- Ported from the tests in src-tauri/src/maintenance/service_history.rs. The
-- thing being protected here is that one call changes four tables together:
-- half of it applied would leave a vehicle with a service record and a
-- reminder that still thinks the work is overdue.

create or replace function pg_temp.vehicle_with_reminder(
  name text,
  interval_days integer default 180,
  interval_km integer default 5000,
  odometer numeric default 10000
)
returns table (vehicle_id uuid, schedule_id uuid)
language plpgsql
as $$
declare
  v uuid;
  t uuid;
  setting uuid;
  s uuid;
begin
  insert into public.vehicles (vehicle_name, vehicle_type, fuel_type, current_odometer)
  values (name, 'van', 'diesel', odometer) returning id into v;

  select id into t from public.maintenance_templates
  where template_key = 'engine_oil_change';

  insert into public.vehicle_maintenance_settings
    (vehicle_id, template_id, custom_time_interval_days, custom_odometer_interval_km)
  values (v, t, interval_days, interval_km) returning id into setting;

  insert into public.maintenance_schedules
    (vehicle_id, template_id, vehicle_maintenance_setting_id,
     next_due_date, next_due_odometer, due_soon_days, due_soon_km)
  values (v, t, setting, current_date - 5, odometer - 100, 14, 500)
  returning id into s;

  return query select v, s;
end;
$$;

do $$
declare
  v uuid;
  s uuid;
  result public.maintenance_completion;
  log record;
  schedule record;
begin
  -- ----------------------------------------------------------------------
  -- Completing a reminder writes history and moves the reminder on
  -- ----------------------------------------------------------------------
  select vehicle_id, schedule_id into v, s from pg_temp.vehicle_with_reminder('Serviced Van');

  -- Raise an alert first, so we can check completing the work clears it.
  perform public.refresh_maintenance_alerts_for_vehicle(v);
  assert (select count(*) from public.alerts where vehicle_id = v and status = 'active') = 1,
    'expected an overdue alert before the work is done';

  result := public.complete_maintenance_schedule(
    schedule_id => s,
    completed_date => current_date,
    odometer => 10500,
    work_performed => 'Changed oil and filter',
    labor_cost => 500,
    parts_cost => 1500
  );

  assert result.reminder_used, 'completing a reminder should say it used one';
  assert result.resolved_alert_count = 1, 'finishing the work should clear its alert';

  select * into log from public.maintenance_logs where id = result.log_id;
  assert log.total_cost = 2000, 'labour plus parts should total 2000, got ' || log.total_cost;
  assert log.odometer = 10500, 'the reading should be the one given';
  assert log.schedule_id = s, 'the record should point at the reminder it completed';

  select * into schedule from public.maintenance_schedules where id = s;
  assert schedule.last_completed_date = current_date, 'the reminder should know when';
  assert schedule.last_completed_odometer = 10500, 'and at what reading';
  assert schedule.next_due_date = current_date + 180, 'next due 180 days on';
  assert schedule.next_due_odometer = 15500, 'next due 5000 km on, got '
    || schedule.next_due_odometer;
  assert schedule.status = 'not_due', 'freshly done work is not due again yet, got '
    || schedule.status;

  assert (select current_odometer from public.vehicles where id = v) = 10500,
    'the vehicle odometer should catch up to the work';
  assert (select count(*) from public.alerts where vehicle_id = v and status = 'active') = 0,
    'no alert should survive the work being done';

  -- ----------------------------------------------------------------------
  -- The odometer only goes up
  -- ----------------------------------------------------------------------
  select vehicle_id, schedule_id into v, s from pg_temp.vehicle_with_reminder('High Reading Van');
  update public.vehicles set current_odometer = 90000 where id = v;

  result := public.complete_maintenance_schedule(
    schedule_id => s, completed_date => current_date, odometer => 50000,
    work_performed => 'Oil change at the yard'
  );
  assert (select current_odometer from public.vehicles where id = v) = 90000,
    'a lower reading must not drag the vehicle odometer backwards';

  -- ----------------------------------------------------------------------
  -- Work cannot be recorded as done at a lower reading than last time
  -- ----------------------------------------------------------------------
  declare
    refused boolean := false;
    message text;
  begin
    begin
      perform public.complete_maintenance_schedule(
        schedule_id => s, completed_date => current_date, odometer => 100,
        work_performed => 'Impossible'
      );
    exception when others then
      refused := true;
      message := sqlerrm;
    end;
    assert refused, 'going backwards should be refused';
    assert message like '%50000%',
      'the message should say what the previous reading was, got: ' || message;
  end;

  -- ----------------------------------------------------------------------
  -- Logging ad-hoc work with no reminder behind it
  -- ----------------------------------------------------------------------
  declare
    plain_vehicle uuid;
    t uuid;
  begin
    insert into public.vehicles (vehicle_name, vehicle_type, fuel_type, current_odometer)
    values ('No Reminder Van', 'van', 'diesel', 3000) returning id into plain_vehicle;
    select id into t from public.maintenance_templates where template_key = 'brake_inspection';

    result := public.log_maintenance(
      vehicle_id => plain_vehicle, template_id => t, completed_date => current_date,
      odometer => 3200, work_performed => 'Checked the brakes'
    );

    assert not result.reminder_used, 'there was no reminder to use';
    assert result.schedule_id is null, 'nothing should have been scheduled';
    assert result.resolved_alert_count = 0, 'there was no alert to clear';
    assert (select count(*) from public.maintenance_logs
            where vehicle_id = plain_vehicle) = 1,
      'the work should still be recorded';
    assert (select current_odometer from public.vehicles where id = plain_vehicle) = 3200,
      'ad-hoc work still updates the odometer';
  end;

  -- ----------------------------------------------------------------------
  -- Logging work that does have a reminder completes it instead
  -- ----------------------------------------------------------------------
  declare
    t uuid;
  begin
    select vehicle_id into v from pg_temp.vehicle_with_reminder('Reminder Van');
    select id into t from public.maintenance_templates where template_key = 'engine_oil_change';

    result := public.log_maintenance(
      vehicle_id => v, template_id => t, completed_date => current_date,
      odometer => 10600, work_performed => 'Oil change'
    );

    assert result.reminder_used,
      'logging work that has a reminder should complete the reminder';
    assert result.schedule_id is not null, 'and should say which reminder';
    assert (select next_due_odometer from public.maintenance_schedules
            where id = result.schedule_id) = 15600,
      'the reminder should have moved on';
  end;

  -- ----------------------------------------------------------------------
  -- A reminder with no intervals records the work but schedules nothing
  -- ----------------------------------------------------------------------
  select vehicle_id, schedule_id into v, s
  from pg_temp.vehicle_with_reminder('No Interval Van', null, null, 5000);

  result := public.complete_maintenance_schedule(
    schedule_id => s, completed_date => current_date, odometer => 5100,
    work_performed => 'Oil change'
  );

  select * into schedule from public.maintenance_schedules where id = s;
  assert schedule.next_due_date is null, 'no interval means no next date';
  assert schedule.next_due_odometer is null, 'no interval means no next reading';
  assert schedule.status = 'needs_setup',
    'a reminder with nothing to go on needs setting up, got ' || schedule.status;
end $$;

-- ---------------------------------------------------------------------------
-- An attachment has to belong to the vehicle it is filed against
-- ---------------------------------------------------------------------------
do $$
declare
  van_a uuid;
  van_b uuid;
  s uuid;
  foreign_receipt uuid;
  refused boolean := false;
begin
  select vehicle_id, schedule_id into van_a, s from pg_temp.vehicle_with_reminder('Van A');
  insert into public.vehicles (vehicle_name, vehicle_type, fuel_type, current_odometer)
  values ('Van B', 'van', 'diesel', 1000) returning id into van_b;

  insert into public.vehicle_documents (vehicle_id, document_type, storage_path)
  values (van_b, 'maintenance_receipt', 'maintenance-receipts/b.png')
  returning id into foreign_receipt;

  begin
    perform public.complete_maintenance_schedule(
      schedule_id => s, completed_date => current_date, odometer => 11000,
      work_performed => 'Oil change', receipt_document_id => foreign_receipt
    );
  exception when others then
    refused := true;
  end;

  assert refused, 'a receipt from another vehicle must not be filed against this one';
end $$;

select 'service history behaves as it did on the desktop' as result;
