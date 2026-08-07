-- Setting up and removing maintenance reminders.
--
-- Ported from the reminder tests in src-tauri/src/maintenance/scheduling.rs.

-- Archiving now asks who is calling, so these tests need to be somebody.
--
-- The rest of this file runs as the superuser and bypasses row level security,
-- which is why it never needed an account before. `archive_*` runs as the
-- definer with the policies switched off, so it checks the caller itself, and
-- that check reads `auth.uid()` — which is nobody at all unless a claim is set.
insert into auth.users (id, email, raw_user_meta_data)
values ('d0000000-0000-0000-0000-0000000000ff', 'archiver@tog5.test',
        '{"display_name": "Test Archiver"}'::jsonb);

set request.jwt.claim.sub = 'd0000000-0000-0000-0000-0000000000ff';

do $$
declare
  v uuid;
  t uuid;
  other_t uuid;
  setting_id uuid;
  again uuid;
  schedule record;
  refused boolean;
  message text;
begin
  insert into public.vehicles (vehicle_name, vehicle_type, fuel_type, current_odometer)
  values ('Reminder Van', 'van', 'diesel', 20000) returning id into v;
  select id into t from public.maintenance_templates where template_key = 'engine_oil_change';
  select id into other_t from public.maintenance_templates where template_key = 'brake_inspection';

  -- ----------------------------------------------------------------------
  -- Adding a reminder creates the schedule behind it
  -- ----------------------------------------------------------------------
  setting_id := public.upsert_vehicle_maintenance_setting(
    vehicle_id => v, template_id => t,
    custom_time_interval_days => 180, custom_odometer_interval_km => 5000
  );

  select * into schedule from public.maintenance_schedules where vehicle_id = v;
  assert schedule.id is not null, 'adding a reminder should create its schedule';
  assert schedule.next_due_date = current_date + 180, 'next due 180 days out';
  assert schedule.next_due_odometer = 25000, 'next due 5000 km on from 20000, got '
    || schedule.next_due_odometer;
  assert schedule.status = 'not_due', 'a brand new reminder is not due yet, got '
    || schedule.status;
  assert schedule.notes is null, 'a properly configured reminder needs no note';
  assert schedule.vehicle_maintenance_setting_id = setting_id,
    'the schedule should point back at the setting';

  -- Defaults come from app settings when not given.
  assert schedule.due_soon_days = 14, 'due-soon days should default to 14';
  assert schedule.due_soon_km = 500, 'due-soon km should default to 500';

  -- ----------------------------------------------------------------------
  -- Editing the reminder updates the same schedule rather than adding one
  -- ----------------------------------------------------------------------
  again := public.upsert_vehicle_maintenance_setting(
    vehicle_id => v, template_id => t,
    custom_time_interval_days => 90, custom_odometer_interval_km => 2500
  );
  assert again = setting_id, 'editing should reuse the same reminder';
  assert (select count(*) from public.maintenance_schedules where vehicle_id = v) = 1,
    'editing must not leave a second schedule behind';

  select * into schedule from public.maintenance_schedules where vehicle_id = v;
  assert schedule.next_due_date = current_date + 90, 'the new interval should apply';
  assert schedule.next_due_odometer = 22500, 'the new distance should apply';

  -- ----------------------------------------------------------------------
  -- A reminder with no interval at all is refused
  -- ----------------------------------------------------------------------
  refused := false;
  begin
    perform public.upsert_vehicle_maintenance_setting(
      vehicle_id => v, template_id => other_t
    );
  exception when others then
    refused := true;
    message := sqlerrm;
  end;
  assert refused, 'a reminder that could never come due should be refused';
  assert message like '%at least one reminder interval%',
    'the message should say what to do, got: ' || message;

  -- ...but a disabled one may have no interval, since it is not going to fire.
  setting_id := public.upsert_vehicle_maintenance_setting(
    vehicle_id => v, template_id => other_t, status => 'disabled'
  );
  select * into schedule from public.maintenance_schedules
  where vehicle_id = v and template_id = other_t;
  assert schedule.status = 'disabled', 'a disabled reminder stays disabled, got '
    || schedule.status;
  assert schedule.notes = 'No reminder interval is set yet.',
    'an unconfigured reminder should say so on screen';

  -- ----------------------------------------------------------------------
  -- Removing a reminder silences it without deleting the history
  -- ----------------------------------------------------------------------
  setting_id := public.upsert_vehicle_maintenance_setting(
    vehicle_id => v, template_id => t,
    custom_time_interval_days => 1, custom_odometer_interval_km => 1
  );
  perform public.refresh_maintenance_alerts_for_vehicle(v);

  perform public.archive_vehicle_maintenance_setting(setting_id);

  assert (select status from public.vehicle_maintenance_settings where id = setting_id)
    = 'disabled', 'removing should disable the reminder';
  assert (select deleted_at from public.vehicle_maintenance_settings where id = setting_id)
    is not null, 'and mark it removed';

  select * into schedule from public.maintenance_schedules
  where vehicle_maintenance_setting_id = setting_id;
  assert schedule.archived_at is not null, 'the schedule should be archived, not deleted';
  assert schedule.status = 'disabled', 'and marked disabled';
  assert (select count(*) from public.alerts
          where vehicle_id = v and status = 'active') = 0,
    'removing a reminder should stop it alerting';

  -- ----------------------------------------------------------------------
  -- Adding it back brings it round again
  -- ----------------------------------------------------------------------
  again := public.upsert_vehicle_maintenance_setting(
    vehicle_id => v, template_id => t,
    custom_time_interval_days => 180, custom_odometer_interval_km => 5000
  );
  assert again = setting_id, 'adding it back should revive the same reminder';
  assert (select deleted_at from public.vehicle_maintenance_settings where id = setting_id)
    is null, 'reviving should clear the removal';

  select * into schedule from public.maintenance_schedules
  where vehicle_maintenance_setting_id = setting_id;
  assert schedule.archived_at is null, 'the schedule should come back too';
  assert schedule.status = 'not_due', 'and be live again, got ' || schedule.status;

  -- ----------------------------------------------------------------------
  -- An archived vehicle takes no new reminders
  -- ----------------------------------------------------------------------
  declare
    archived_vehicle uuid;
  begin
    insert into public.vehicles (vehicle_name, vehicle_type, fuel_type, current_odometer, status,
                                 archived_at)
    values ('Retired Van', 'van', 'diesel', 5000, 'archived', now())
    returning id into archived_vehicle;

    refused := false;
    begin
      perform public.upsert_vehicle_maintenance_setting(
        vehicle_id => archived_vehicle, template_id => t,
        custom_time_interval_days => 180
      );
    exception when others then
      refused := true;
    end;
    assert refused, 'a retired vehicle should not take on new maintenance';
  end;

  -- ----------------------------------------------------------------------
  -- Syncing brings everything back into step
  -- ----------------------------------------------------------------------
  assert public.sync_maintenance_schedules_for_vehicle(v) >= 2,
    'syncing should touch every reminder on the vehicle';
end $$;

select 'maintenance reminders behave as they did on the desktop' as result;
