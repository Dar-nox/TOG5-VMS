-- The flat shapes the screens expect, and the security they must not bypass.

do $$
declare
  v uuid;
  photo uuid;
  receipt uuid;
  fuel uuid;
  row_out record;
begin
  insert into public.vehicles (vehicle_name, vehicle_type, fuel_type, current_odometer)
  values ('View Van', 'van', 'diesel', 1000) returning id into v;

  insert into public.vehicle_photos (vehicle_id, storage_path, mime_type, is_primary)
  values (v, 'vehicle-photos/van.png', 'image/png', true) returning id into photo;
  update public.vehicles set primary_photo_id = photo where id = v;

  insert into public.vehicle_documents (vehicle_id, document_type, storage_path, original_filename)
  values (v, 'fuel_receipt', 'fuel-receipts/r.png', 'receipt.png') returning id into receipt;

  -- ----------------------------------------------------------------------
  -- A vehicle carries its photo
  -- ----------------------------------------------------------------------
  select * into row_out from public.vehicles_with_photo where id = v;
  assert row_out.primary_photo_path = 'vehicle-photos/van.png',
    'the vehicle should carry its photo path';
  assert row_out.primary_photo_mime_type = 'image/png', 'and its type';

  -- ----------------------------------------------------------------------
  -- A fuel log carries the vehicle name, the receipt, and its explanation
  -- ----------------------------------------------------------------------
  insert into public.fuel_logs
    (vehicle_id, fuel_date, odometer, fuel_type, liters, total_amount, is_full_tank,
     receipt_document_id)
  values (v, now(), 1000, 'diesel', 50, 2500, true, receipt) returning id into fuel;

  select * into row_out from public.fuel_logs_detailed where id = fuel;
  assert row_out.vehicle_name = 'View Van', 'the log should name its vehicle';
  assert row_out.receipt_file_path = 'fuel-receipts/r.png', 'and carry the receipt';
  assert row_out.receipt_original_filename = 'receipt.png', 'and the original name';
  assert row_out.efficiency_reason like 'Waiting for another%',
    'a first full tank is waiting for a second, got: ' || row_out.efficiency_reason;
  assert row_out.warnings = '[]'::jsonb, 'diesel in a diesel van warns about nothing';

  -- ----------------------------------------------------------------------
  -- Warnings appear when the fuel does not match the vehicle
  -- ----------------------------------------------------------------------
  declare
    petrol_van uuid;
    wrong_fuel uuid;
  begin
    insert into public.vehicles (vehicle_name, vehicle_type, fuel_type, current_odometer)
    values ('Petrol Van', 'van', 'gasoline', 500) returning id into petrol_van;

    insert into public.fuel_logs
      (vehicle_id, fuel_date, odometer, fuel_type, liters, total_amount, is_full_tank)
    values (petrol_van, now(), 500, 'diesel', 40, 2000, true) returning id into wrong_fuel;

    select * into row_out from public.fuel_logs_detailed where id = wrong_fuel;
    assert row_out.warnings::text like '%fuel_type_mismatch%',
      'diesel in a petrol van should warn, got: ' || row_out.warnings::text;
  end;

  -- ----------------------------------------------------------------------
  -- AdBlue explains itself
  -- ----------------------------------------------------------------------
  declare
    adblue uuid;
  begin
    insert into public.fuel_logs
      (vehicle_id, fuel_date, odometer, fuel_type, liters, total_amount, is_full_tank)
    values (v, now(), 1100, 'def_adblue', 10, 500, true) returning id into adblue;

    select * into row_out from public.fuel_logs_detailed where id = adblue;
    assert row_out.efficiency_reason = 'DEF/AdBlue is not counted as diesel fuel consumption.',
      'unexpected reason: ' || row_out.efficiency_reason;
    assert row_out.warnings::text like '%def_adblue_not_fuel%', 'AdBlue should say so';
  end;

  -- ----------------------------------------------------------------------
  -- A partial tank says why it has no reading
  -- ----------------------------------------------------------------------
  declare
    partial uuid;
  begin
    insert into public.fuel_logs
      (vehicle_id, fuel_date, odometer, fuel_type, liters, total_amount, is_full_tank)
    values (v, now(), 1200, 'diesel', 20, 1000, false) returning id into partial;

    select * into row_out from public.fuel_logs_detailed where id = partial;
    assert row_out.efficiency_reason like 'Partial tank%',
      'unexpected reason: ' || row_out.efficiency_reason;
  end;

  -- ----------------------------------------------------------------------
  -- Maintenance rows carry the item name
  -- ----------------------------------------------------------------------
  declare
    t uuid;
    setting_id uuid;
  begin
    select id into t from public.maintenance_templates where template_key = 'engine_oil_change';
    setting_id := public.upsert_vehicle_maintenance_setting(
      vehicle_id => v, template_id => t, custom_time_interval_days => 180
    );

    select * into row_out from public.maintenance_schedules_detailed where vehicle_id = v;
    assert row_out.template_name = 'Engine Oil Change', 'the schedule should name the item';
    assert row_out.vehicle_name = 'View Van', 'and the vehicle';

    select * into row_out from public.vehicle_maintenance_settings_detailed
    where id = setting_id;
    assert row_out.template_name = 'Engine Oil Change', 'the reminder should name the item';
    assert row_out.template_priority = 'high', 'and carry its priority';
  end;
end $$;

-- ---------------------------------------------------------------------------
-- The views must not be a way around row level security
-- ---------------------------------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data)
values ('c0000000-0000-0000-0000-000000000001', 'owner@tog5.test',
        '{"display_name": "Ana Cruz"}'::jsonb);

begin;
  set local role anon;
  do $$
  begin
    -- A view runs as its owner unless it is marked security_invoker, which
    -- would let anyone with the public key read the whole fleet through it.
    assert (select count(*) from public.vehicles_with_photo) = 0,
      'vehicles_with_photo must not bypass the access rules';
    assert (select count(*) from public.fuel_logs_detailed) = 0,
      'fuel_logs_detailed must not bypass the access rules';
    assert (select count(*) from public.maintenance_logs_detailed) = 0,
      'maintenance_logs_detailed must not bypass the access rules';
    assert (select count(*) from public.expenses_detailed) = 0,
      'expenses_detailed must not bypass the access rules';
    assert (select count(*) from public.alerts_detailed) = 0,
      'alerts_detailed must not bypass the access rules';
    assert (select count(*) from public.trips_with_people) = 0,
      'trips_with_people must not bypass the access rules';
    assert (select count(*) from public.cost_events) = 0,
      'cost_events must not bypass the access rules';
    assert (select count(*) from public.maintenance_schedules_detailed) = 0,
      'maintenance_schedules_detailed must not bypass the access rules';
    assert (select count(*) from public.vehicle_maintenance_settings_detailed) = 0,
      'vehicle_maintenance_settings_detailed must not bypass the access rules';
  end $$;
rollback;

select 'read views carry the joins and respect the access rules' as result;
