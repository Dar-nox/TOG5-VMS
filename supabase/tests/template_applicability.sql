-- Which maintenance applies to which vehicle.
--
-- These are the rules the desktop app pinned in
-- src-tauri/src/maintenance/repository.rs, and they matter more than most
-- tests here: getting one wrong does not raise an error, it quietly tells a
-- mechanic to service something the vehicle does not have — or hides work it
-- genuinely needs.

create or replace function pg_temp.status_for(
  template_key text,
  vehicle_type text,
  fuel_type text,
  transmission_type text,
  drivetrain text,
  features text[] default array[]::text[]
)
returns text
language sql
stable
as $$
  select (public.evaluate_template_applicability(
    t.id, vehicle_type, fuel_type, transmission_type, drivetrain, features
  )).applicability_status
  from public.maintenance_templates t
  where t.template_key = status_for.template_key;
$$;

do $$
begin
  -- ----------------------------------------------------------------------
  -- Universal items apply to everything
  -- ----------------------------------------------------------------------
  assert pg_temp.status_for('brake_inspection', 'van', 'gasoline', 'automatic', 'fwd')
    = 'applicable', 'brakes apply to a petrol van';
  assert pg_temp.status_for('brake_inspection', 'truck', 'diesel', 'manual', 'rwd')
    = 'applicable', 'brakes apply to a diesel truck';
  assert pg_temp.status_for('brake_inspection', 'sedan', 'full_ev', 'none', 'rwd')
    = 'applicable', 'brakes apply to an electric car too';
  assert pg_temp.status_for('tire_rotation', 'sedan', 'full_ev', 'none', 'rwd')
    = 'applicable', 'tyres are tyres whatever drives them';

  -- ----------------------------------------------------------------------
  -- A diesel has no spark plugs
  -- ----------------------------------------------------------------------
  assert pg_temp.status_for('spark_plug_replacement', 'truck', 'diesel', 'manual', 'rwd')
    = 'excluded', 'a diesel engine must never be told to change its spark plugs';
  assert pg_temp.status_for('spark_plug_replacement', 'van', 'gasoline', 'automatic', 'fwd')
    = 'applicable', 'a petrol engine does have spark plugs';

  -- ----------------------------------------------------------------------
  -- A petrol engine has no DEF/AdBlue and no glow plugs
  -- ----------------------------------------------------------------------
  assert pg_temp.status_for('def_adblue_check_refill', 'van', 'gasoline', 'automatic', 'fwd')
    = 'excluded', 'petrol vehicles do not use DEF/AdBlue';
  assert pg_temp.status_for('glow_plug_inspection', 'van', 'gasoline', 'automatic', 'fwd')
    = 'excluded', 'petrol engines have no glow plugs';

  -- ----------------------------------------------------------------------
  -- An electric vehicle has no engine to service
  -- ----------------------------------------------------------------------
  assert pg_temp.status_for('engine_oil_change', 'sedan', 'full_ev', 'none', 'rwd')
    = 'excluded', 'an electric car has no engine oil';
  assert pg_temp.status_for('oil_filter_replacement', 'sedan', 'full_ev', 'none', 'rwd')
    = 'excluded', 'an electric car has no oil filter';
  assert pg_temp.status_for('fuel_filter_replacement', 'sedan', 'full_ev', 'none', 'rwd')
    = 'excluded', 'an electric car has no fuel filter';
  assert pg_temp.status_for('spark_plug_replacement', 'sedan', 'full_ev', 'none', 'rwd')
    = 'excluded', 'an electric car has no spark plugs';
  assert pg_temp.status_for('exhaust_inspection', 'sedan', 'full_ev', 'none', 'rwd')
    = 'excluded', 'an electric car has no exhaust';
  assert pg_temp.status_for('engine_air_filter_replacement', 'sedan', 'full_ev', 'none', 'rwd')
    = 'excluded', 'an electric car has no engine air filter';

  -- ----------------------------------------------------------------------
  -- Transmission
  -- ----------------------------------------------------------------------
  assert pg_temp.status_for('manual_clutch_inspection', 'truck', 'diesel', 'manual', 'rwd')
    = 'applicable', 'a manual gearbox has a clutch to inspect';
  assert pg_temp.status_for('manual_clutch_inspection', 'van', 'gasoline', 'automatic', 'fwd')
    <> 'applicable', 'an automatic must not be scheduled for clutch work';

  -- ----------------------------------------------------------------------
  -- Drivetrain
  -- ----------------------------------------------------------------------
  assert pg_temp.status_for('transfer_case_fluid_change', 'suv', 'gasoline', 'automatic', 'awd')
    = 'applicable', 'all-wheel drive has a transfer case';
  assert pg_temp.status_for('transfer_case_fluid_change', 'truck', 'diesel', 'manual', '4wd')
    = 'applicable', 'four-wheel drive has a transfer case';
  assert pg_temp.status_for('transfer_case_fluid_change', 'sedan', 'gasoline', 'automatic', 'fwd')
    <> 'applicable', 'front-wheel drive has no transfer case';

  -- ----------------------------------------------------------------------
  -- Items that wait for a feature to be ticked
  -- ----------------------------------------------------------------------
  assert pg_temp.status_for('dpf_inspection', 'truck', 'diesel', 'manual', 'rwd')
    = 'requires_feature',
    'a diesel without the filter ticked should ask for it rather than silently skip it';
  assert pg_temp.status_for('dpf_inspection', 'truck', 'diesel', 'manual', 'rwd',
                            array['diesel_particulate_filter'])
    = 'applicable', 'once the filter is ticked the work applies';
  assert pg_temp.status_for('dpf_inspection', 'van', 'gasoline', 'automatic', 'fwd',
                            array['diesel_particulate_filter'])
    = 'excluded', 'a petrol vehicle is excluded even if somebody tickes the filter';

  assert pg_temp.status_for('timing_belt_inspection_replacement', 'sedan', 'gasoline',
                            'manual', 'fwd')
    = 'requires_feature', 'a belt is only scheduled once the vehicle is known to have one';
  assert pg_temp.status_for('timing_belt_inspection_replacement', 'sedan', 'gasoline',
                            'manual', 'fwd', array['timing_belt'])
    = 'applicable', 'once the belt is ticked the work applies';
end $$;

-- ---------------------------------------------------------------------------
-- The explanations people read
-- ---------------------------------------------------------------------------
do $$
declare
  e public.template_applicability;
  oil_id uuid;
  brakes_id uuid;
  dpf_id uuid;
begin
  select id into oil_id from public.maintenance_templates
    where template_key = 'engine_oil_change';
  select id into brakes_id from public.maintenance_templates
    where template_key = 'brake_inspection';
  select id into dpf_id from public.maintenance_templates
    where template_key = 'dpf_inspection';

  e := public.evaluate_template_applicability(brakes_id, 'van', 'gasoline', 'automatic', 'fwd',
                                              array[]::text[]);
  assert e.reason = 'Universal template for most vehicles.', 'unexpected reason: ' || e.reason;
  assert e.is_auto_applicable, 'universal work should apply by itself';
  assert cardinality(e.warnings) = 0, 'universal work needs no warning';

  e := public.evaluate_template_applicability(oil_id, 'sedan', 'full_ev', 'none', 'rwd',
                                              array[]::text[]);
  assert e.reason = 'Full EVs do not use engine oil.', 'unexpected reason: ' || e.reason;
  assert not e.is_auto_applicable, 'excluded work must not apply by itself';
  assert e.warnings = array['Not auto-applied for this vehicle.'],
    'excluded work should say why it was not applied';
  assert cardinality(e.matched_rule_ids) > 0,
    'an exclusion should point at the rule that caused it';

  e := public.evaluate_template_applicability(dpf_id, 'truck', 'diesel', 'manual', 'rwd',
                                              array[]::text[]);
  assert e.reason = 'Requires vehicle feature: diesel particulate filter.',
    'the missing feature should be named in words, got: ' || e.reason;
  assert not e.is_auto_applicable, 'work waiting on a feature must not apply by itself';
end $$;

-- ---------------------------------------------------------------------------
-- The seed itself
-- ---------------------------------------------------------------------------
do $$
begin
  assert (select count(*) from public.maintenance_templates) = 35,
    'expected the 35 default maintenance items';
  assert (select count(*) from public.maintenance_template_rules) = 81,
    'expected the 81 applicability rules';
  assert (select count(*) from public.maintenance_templates where template_key is null) = 0,
    'every seeded item needs its stable key, or re-seeding will duplicate it';
end $$;

select 'maintenance applicability matches the desktop rules' as result;
