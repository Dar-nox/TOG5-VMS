-- Items somebody adds themselves, and the checks that were in Rust.
--
-- Ported from the template tests in src-tauri/src/maintenance/repository.rs.
-- These rules used to run before the desktop app wrote anything; now that a
-- phone can reach the database directly, they have to run in the database or
-- they do not run at all.

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
  created uuid;
  row_out record;
begin
  -- ----------------------------------------------------------------------
  -- A category is stored as a slug, however it was typed
  -- ----------------------------------------------------------------------
  created := public.create_maintenance_template(
    name => '  Winch Cable Inspection  ',
    category => 'Recovery Gear & Winch',
    default_time_interval_days => 180
  );

  select * into row_out from public.maintenance_templates where id = created;
  assert row_out.name = 'Winch Cable Inspection', 'the name should be trimmed, got: '
    || row_out.name;
  assert row_out.category = 'recovery_gear_winch',
    'the category should be a slug, got: ' || row_out.category;
  assert row_out.template_key is null,
    'an item somebody added must have no key, or re-seeding would overwrite it';
  assert row_out.priority = 'medium', 'priority should fall back to medium';
  assert row_out.default_due_soon_days = 14, 'warn days should fall back to the setting';
  assert row_out.default_due_soon_km = 500, 'warn km should fall back to the setting';

  -- ----------------------------------------------------------------------
  -- The same name twice is refused
  -- ----------------------------------------------------------------------
  begin
    perform public.create_maintenance_template(
      name => 'winch cable inspection', category => 'other'
    );
    assert false, 'a second item with the same name should have been refused';
  exception when others then
    assert sqlerrm = 'A maintenance item with this name already exists.',
      'unexpected message: ' || sqlerrm;
  end;

  -- ...but an item may keep its own name when it is edited.
  perform public.update_maintenance_template(
    template_id => created,
    name => 'Winch Cable Inspection',
    category => 'recovery',
    default_time_interval_days => 90,
    priority => 'high'
  );

  select * into row_out from public.maintenance_templates where id = created;
  assert row_out.default_time_interval_days = 90, 'the interval should have changed';
  assert row_out.priority = 'high', 'the priority should have changed';
  assert row_out.category = 'recovery', 'the category should have changed';

  -- ----------------------------------------------------------------------
  -- A seeded item is allowed to share a name with one somebody typed in
  -- ----------------------------------------------------------------------
  declare
    twin uuid;
  begin
    twin := public.create_maintenance_template(
      name => 'Engine Oil Change', category => 'engine'
    );
    assert twin is not null,
      'the seeded list must not block a name — the client''s own data already has these';
  end;

  -- ----------------------------------------------------------------------
  -- What is refused, and in words somebody can act on
  -- ----------------------------------------------------------------------
  declare
    attempt record;
  begin
    for attempt in
      select * from (values
        ('   ', 'engine', 180, 14, 'medium', 'Maintenance item name is required.'),
        ('Named', '  ', 180, 14, 'medium', 'Maintenance item category is required.'),
        ('Named', 'engine', 0, 14, 'medium', 'Default day interval must be greater than zero.'),
        ('Named', 'engine', 180, -1, 'medium', 'Default warn days cannot be negative.'),
        ('Named', 'engine', 180, 14, 'urgent', 'Choose a valid maintenance item priority.')
      ) as t(name, category, days, warn_days, priority, expected)
    loop
      begin
        perform public.create_maintenance_template(
          name => attempt.name,
          category => attempt.category,
          default_time_interval_days => attempt.days,
          default_due_soon_days => attempt.warn_days,
          priority => attempt.priority
        );
        assert false, 'should have been refused: ' || attempt.expected;
      exception when others then
        assert sqlerrm = attempt.expected,
          'expected "' || attempt.expected || '", got "' || sqlerrm || '"';
      end;
    end loop;
  end;

  -- Editing something that is not there says so rather than doing nothing.
  begin
    perform public.update_maintenance_template(
      template_id => '00000000-0000-0000-0000-000000000000',
      name => 'Ghost', category => 'other'
    );
    assert false, 'editing a missing item should have been refused';
  exception when others then
    assert sqlerrm = 'Maintenance item was not found.', 'unexpected message: ' || sqlerrm;
  end;
end $$;

-- ---------------------------------------------------------------------------
-- Archiving takes the reminders with it
-- ---------------------------------------------------------------------------
do $$
declare
  v uuid;
  item uuid;
  setting_id uuid;
begin
  insert into public.vehicles (vehicle_name, vehicle_type, fuel_type, current_odometer)
  values ('Archive Van', 'van', 'diesel', 5000) returning id into v;

  item := public.create_maintenance_template(
    name => 'Roof Rack Bolts', category => 'body', default_time_interval_days => 120
  );
  setting_id := public.upsert_vehicle_maintenance_setting(
    vehicle_id => v, template_id => item, custom_time_interval_days => 120
  );

  assert exists (select 1 from public.maintenance_schedules
                 where vehicle_maintenance_setting_id = setting_id and deleted_at is null),
    'saving a reminder should have built a schedule';

  perform public.archive_maintenance_template(item);

  assert not (select is_active from public.maintenance_templates where id = item),
    'the item should be out of circulation';
  assert (select deleted_at from public.vehicle_maintenance_settings where id = setting_id)
         is not null,
    'its reminders should go with it';
  assert (select status from public.maintenance_schedules
          where vehicle_maintenance_setting_id = setting_id) = 'disabled',
    'and so should the schedules underneath them';
  assert not exists (
    select 1 from public.alerts
    where maintenance_schedule_id in (
      select id from public.maintenance_schedules
      where vehicle_maintenance_setting_id = setting_id
    ) and status = 'active'
  ), 'an archived item must not keep raising alerts';
end $$;

-- ---------------------------------------------------------------------------
-- The item list, and what the alerts screen reads
-- ---------------------------------------------------------------------------
do $$
declare
  v uuid;
  t uuid;
  listed integer;
begin
  -- Seeded items stay out of the list until something references them, so the
  -- screen shows the handful somebody set up rather than all 35. Items
  -- somebody typed in are always listed, which is why this counts only the
  -- seeded ones.
  select count(*) into listed
  from public.list_user_maintenance_templates() where template_key is not null;
  assert listed = 0,
    'no seeded item should be listed before a vehicle uses one, got ' || listed;

  insert into public.vehicles (vehicle_name, vehicle_type, fuel_type, current_odometer)
  values ('Listed Van', 'van', 'diesel', 30000) returning id into v;
  select id into t from public.maintenance_templates where template_key = 'engine_oil_change';
  perform public.upsert_vehicle_maintenance_setting(
    vehicle_id => v, template_id => t, custom_time_interval_days => 180
  );

  assert exists (select 1 from public.list_user_maintenance_templates()
                 where template_key = 'engine_oil_change'),
    'an item a vehicle uses should appear in the list';

  assert (select jsonb_array_length(rules) from public.list_user_maintenance_templates()
          where template_key = 'engine_oil_change') > 0,
    'and carry its rules, which is what the applicability screen reads';

  -- The alerts screen reads maintenanceTemplateName. Under any other name the
  -- alert still shows, with a generic heading instead of the item.
  update public.maintenance_schedules
  set next_due_date = current_date - 5
  where vehicle_id = v;
  perform public.refresh_maintenance_alerts_for_vehicle(v);

  assert (select maintenance_template_name from public.alerts_detailed
          where vehicle_id = v and status = 'active' limit 1) = 'Engine Oil Change',
    'the alert should name the item it is about';
end $$;

select 'maintenance items are checked the way the desktop app checked them' as result;
