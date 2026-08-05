-- The default maintenance items, and the rules that decide which vehicles get
-- them.
--
-- Generated from src-tauri/src/maintenance/seeds.rs rather than transcribed by
-- hand — 35 items and 81 rules is far too much to retype without introducing a
-- typo, and a wrong rule here means a diesel engine quietly being told to
-- change its spark plugs.
--
-- A rule leaves a dimension null to mean "any". An include rule with no
-- dimensions set at all therefore matches every vehicle, which is how the
-- universal items work. sort_order preserves the order the rules were written
-- in, because the first matching rule supplies the explanation the user reads.
--
-- Seeding is idempotent: an item the user has renamed, archived, or retuned
-- keeps their changes, because the conflict target is the stable template_key
-- and existing rows are left alone.

insert into public.maintenance_templates (
  template_key, name, category, description,
  default_time_interval_days, default_odometer_interval_km,
  default_due_soon_days, default_due_soon_km, priority
) values
  ('engine_oil_change', 'Engine Oil Change', 'oil_filters', 'Replace engine oil for combustion or hybrid combustion engines.', 180, 5000, 14, 500, 'high'),
  ('oil_filter_replacement', 'Oil Filter Replacement', 'oil_filters', 'Replace the engine oil filter during regular oil service.', 180, 5000, 14, 500, 'high'),
  ('engine_air_filter_replacement', 'Engine Air Filter Replacement', 'oil_filters', 'Inspect or replace the combustion engine air filter.', 365, 10000, 14, 500, 'medium'),
  ('fuel_filter_replacement', 'Fuel Filter Replacement', 'oil_filters', 'Replace fuel filter for gasoline and hybrid gasoline vehicles when applicable.', 365, 20000, 14, 500, 'medium'),
  ('diesel_fuel_filter_replacement', 'Diesel Fuel Filter Replacement', 'diesel_emissions', 'Replace the diesel fuel filter.', 365, 15000, 14, 500, 'high'),
  ('water_separator_service', 'Water Separator Service', 'diesel_emissions', 'Drain or service the diesel water separator when equipped.', 180, 10000, 14, 500, 'medium'),
  ('spark_plug_replacement', 'Spark Plug Replacement', 'gasoline_ignition', 'Replace spark plugs on gasoline combustion engines.', 730, 40000, 14, 500, 'medium'),
  ('glow_plug_inspection', 'Glow Plug Inspection', 'diesel_emissions', 'Inspect glow plugs on diesel engines.', 365, 20000, 14, 500, 'medium'),
  ('def_adblue_check_refill', 'DEF/AdBlue Check and Refill', 'diesel_emissions', 'Check DEF/AdBlue level and refill when the vehicle is equipped.', 90, 5000, 14, 500, 'medium'),
  ('dpf_inspection', 'DPF Inspection', 'diesel_emissions', 'Inspect diesel particulate filter condition and regeneration status.', 180, 10000, 14, 500, 'medium'),
  ('brake_inspection', 'Brake Inspection', 'brakes', 'Inspect brake system condition.', 180, 10000, 14, 500, 'high'),
  ('brake_pad_inspection_replacement', 'Brake Pad Inspection and Replacement', 'brakes', 'Inspect brake pads and replace when worn.', 180, 10000, 14, 500, 'high'),
  ('brake_fluid_replacement', 'Brake Fluid Replacement', 'brakes', 'Replace brake fluid on the recommended interval.', 730, null, 14, 500, 'medium'),
  ('tire_pressure_check', 'Tire Pressure Check', 'tires_wheels', 'Check and adjust tire pressure.', 30, null, 14, 500, 'medium'),
  ('tire_rotation', 'Tire Rotation', 'tires_wheels', 'Rotate tires to promote even wear.', 180, 10000, 14, 500, 'medium'),
  ('tire_tread_inspection', 'Tire Tread Inspection', 'tires_wheels', 'Inspect tire tread depth and wear pattern.', 90, 5000, 14, 500, 'medium'),
  ('wheel_alignment', 'Wheel Alignment', 'tires_wheels', 'Check wheel alignment when wear or handling suggests it.', 365, 20000, 14, 500, 'medium'),
  ('battery_health_check', 'Battery Health Check', 'battery_electrical', 'Check battery condition and charging health.', 180, null, 14, 500, 'medium'),
  ('coolant_check', 'Coolant Check', 'cooling', 'Check coolant level and condition for equipped vehicles.', 90, 5000, 14, 500, 'medium'),
  ('coolant_replacement', 'Coolant Replacement', 'cooling', 'Replace coolant on interval when the vehicle has a coolant system.', 730, 40000, 14, 500, 'medium'),
  ('transmission_fluid_change', 'Transmission Fluid Change', 'transmission', 'Replace automatic, CVT, or DCT transmission fluid.', 730, 40000, 14, 500, 'medium'),
  ('manual_transmission_gear_oil', 'Manual Transmission Gear Oil Replacement', 'transmission', 'Replace manual transmission gear oil.', 730, 40000, 14, 500, 'medium'),
  ('manual_clutch_inspection', 'Manual Clutch Inspection', 'transmission', 'Inspect clutch operation and wear on manual vehicles.', 365, 20000, 14, 500, 'medium'),
  ('differential_oil_change', 'Differential Oil Change', 'transmission', 'Replace differential oil for drivetrains that use a serviceable differential.', 730, 40000, 14, 500, 'medium'),
  ('transfer_case_fluid_change', 'Transfer Case Fluid Change', 'transmission', 'Replace transfer case fluid for AWD or 4WD vehicles.', 730, 40000, 14, 500, 'medium'),
  ('cabin_air_filter_replacement', 'Cabin Air Filter Replacement', 'oil_filters', 'Replace cabin air filter when equipped.', 365, 15000, 14, 500, 'low'),
  ('wiper_inspection_replacement', 'Wiper Inspection and Replacement', 'other', 'Inspect windshield wipers and replace when worn.', 180, null, 14, 500, 'low'),
  ('registration_renewal', 'Registration Renewal', 'legal_documents', 'Track vehicle registration renewal.', 365, null, 14, 500, 'critical'),
  ('insurance_renewal', 'Insurance Renewal', 'legal_documents', 'Track vehicle insurance renewal.', 365, null, 14, 500, 'critical'),
  ('exhaust_inspection', 'Exhaust Inspection', 'other', 'Inspect exhaust system condition for combustion vehicles.', 365, 20000, 14, 500, 'low'),
  ('timing_belt_inspection_replacement', 'Timing Belt Inspection and Replacement', 'belts_hoses', 'Inspect or replace the timing belt when the vehicle has one.', 730, 60000, 14, 500, 'high'),
  ('timing_chain_inspection', 'Timing Chain Inspection', 'belts_hoses', 'Inspect timing chain condition when the vehicle has one.', 730, 60000, 14, 500, 'medium'),
  ('turbocharger_inspection', 'Turbocharger Inspection', 'other', 'Inspect turbocharger condition when equipped.', 365, 20000, 14, 500, 'medium'),
  ('hybrid_battery_health_check', 'Hybrid Battery Health Check', 'ev_hybrid', 'Check hybrid battery health on hybrid vehicles.', 365, null, 14, 500, 'medium'),
  ('ev_battery_health_check', 'EV Battery Health Check', 'ev_hybrid', 'Check high-voltage EV battery health.', 365, null, 14, 500, 'medium')
on conflict (template_key) where template_key is not null do nothing;

-- Rules are keyed to their item by template_key so this block does not depend
-- on any generated id.
insert into public.maintenance_template_rules (
  template_id, sort_order,
  applies_to_vehicle_type, applies_to_fuel_type,
  applies_to_transmission_type, applies_to_drivetrain,
  requires_feature, excludes_feature, rule_type, notes
)
select t.id, seed.sort_order,
       seed.vehicle_type, seed.fuel_type, seed.transmission_type, seed.drivetrain,
       seed.requires_feature, seed.excludes_feature, seed.rule_type, seed.notes
from (values
  ('engine_oil_change', 1, null, 'gasoline', null, null, null, null, 'include', 'Gasoline combustion maintenance.'),
  ('engine_oil_change', 2, null, 'diesel', null, null, null, null, 'include', 'Diesel combustion maintenance.'),
  ('engine_oil_change', 3, null, 'hybrid_gasoline', null, null, null, null, 'include', 'Hybrid gasoline combustion maintenance.'),
  ('engine_oil_change', 4, null, 'hybrid_diesel', null, null, null, null, 'include', 'Hybrid diesel combustion maintenance.'),
  ('engine_oil_change', 5, null, 'full_ev', null, null, null, null, 'exclude', 'Full EVs do not use engine oil.'),
  ('oil_filter_replacement', 1, null, 'gasoline', null, null, null, null, 'include', 'Gasoline combustion maintenance.'),
  ('oil_filter_replacement', 2, null, 'diesel', null, null, null, null, 'include', 'Diesel combustion maintenance.'),
  ('oil_filter_replacement', 3, null, 'hybrid_gasoline', null, null, null, null, 'include', 'Hybrid gasoline combustion maintenance.'),
  ('oil_filter_replacement', 4, null, 'hybrid_diesel', null, null, null, null, 'include', 'Hybrid diesel combustion maintenance.'),
  ('oil_filter_replacement', 5, null, 'full_ev', null, null, null, null, 'exclude', 'Full EVs do not use engine oil filters.'),
  ('engine_air_filter_replacement', 1, null, 'gasoline', null, null, null, null, 'include', 'Gasoline combustion maintenance.'),
  ('engine_air_filter_replacement', 2, null, 'diesel', null, null, null, null, 'include', 'Diesel combustion maintenance.'),
  ('engine_air_filter_replacement', 3, null, 'hybrid_gasoline', null, null, null, null, 'include', 'Hybrid gasoline combustion maintenance.'),
  ('engine_air_filter_replacement', 4, null, 'hybrid_diesel', null, null, null, null, 'include', 'Hybrid diesel combustion maintenance.'),
  ('engine_air_filter_replacement', 5, null, 'full_ev', null, null, null, null, 'exclude', 'Full EVs do not use combustion engine air filters.'),
  ('fuel_filter_replacement', 1, null, 'gasoline', null, null, null, null, 'include', 'Gasoline fuel system maintenance.'),
  ('fuel_filter_replacement', 2, null, 'hybrid_gasoline', null, null, null, null, 'include', 'Hybrid gasoline fuel system maintenance.'),
  ('fuel_filter_replacement', 3, null, 'diesel', null, null, null, null, 'exclude', 'Diesel vehicles use diesel fuel filter templates.'),
  ('fuel_filter_replacement', 4, null, 'hybrid_diesel', null, null, null, null, 'exclude', 'Hybrid diesel vehicles use diesel fuel filter templates.'),
  ('fuel_filter_replacement', 5, null, 'full_ev', null, null, null, null, 'exclude', 'Full EVs do not use fuel filters.'),
  ('diesel_fuel_filter_replacement', 1, null, 'diesel', null, null, null, null, 'include', 'Diesel-specific maintenance.'),
  ('diesel_fuel_filter_replacement', 2, null, 'hybrid_diesel', null, null, null, null, 'include', 'Hybrid diesel-specific maintenance.'),
  ('diesel_fuel_filter_replacement', 3, null, 'gasoline', null, null, null, null, 'exclude', 'Only diesel fuel systems use this template.'),
  ('diesel_fuel_filter_replacement', 4, null, 'hybrid_gasoline', null, null, null, null, 'exclude', 'Only diesel fuel systems use this template.'),
  ('diesel_fuel_filter_replacement', 5, null, 'full_ev', null, null, null, null, 'exclude', 'Full EVs should not receive diesel maintenance.'),
  ('water_separator_service', 1, null, 'diesel', null, null, null, null, 'include', 'Diesel-specific maintenance.'),
  ('water_separator_service', 2, null, 'hybrid_diesel', null, null, null, null, 'include', 'Hybrid diesel-specific maintenance.'),
  ('water_separator_service', 3, null, 'gasoline', null, null, null, null, 'exclude', 'Only diesel fuel systems use this template.'),
  ('water_separator_service', 4, null, 'hybrid_gasoline', null, null, null, null, 'exclude', 'Only diesel fuel systems use this template.'),
  ('water_separator_service', 5, null, 'full_ev', null, null, null, null, 'exclude', 'Full EVs should not receive diesel maintenance.'),
  ('spark_plug_replacement', 1, null, 'gasoline', null, null, null, null, 'include', 'Gasoline ignition maintenance.'),
  ('spark_plug_replacement', 2, null, 'hybrid_gasoline', null, null, null, null, 'include', 'Hybrid gasoline ignition maintenance.'),
  ('spark_plug_replacement', 3, null, 'diesel', null, null, null, null, 'exclude', 'Diesel vehicles do not use spark plugs.'),
  ('spark_plug_replacement', 4, null, 'hybrid_diesel', null, null, null, null, 'exclude', 'Hybrid diesel vehicles do not use spark plugs.'),
  ('spark_plug_replacement', 5, null, 'full_ev', null, null, null, null, 'exclude', 'Full EVs do not use spark plugs.'),
  ('glow_plug_inspection', 1, null, 'diesel', null, null, null, null, 'include', 'Diesel-specific maintenance.'),
  ('glow_plug_inspection', 2, null, 'hybrid_diesel', null, null, null, null, 'include', 'Hybrid diesel-specific maintenance.'),
  ('glow_plug_inspection', 3, null, 'gasoline', null, null, null, null, 'exclude', 'Glow plugs are diesel-specific.'),
  ('glow_plug_inspection', 4, null, 'hybrid_gasoline', null, null, null, null, 'exclude', 'Glow plugs are diesel-specific.'),
  ('glow_plug_inspection', 5, null, 'full_ev', null, null, null, null, 'exclude', 'Full EVs should not receive diesel maintenance.'),
  ('def_adblue_check_refill', 1, null, 'diesel', null, null, 'def_adblue', null, 'include', 'Applies only when a diesel vehicle has DEF/AdBlue equipment.'),
  ('def_adblue_check_refill', 2, null, 'hybrid_diesel', null, null, 'def_adblue', null, 'include', 'Applies only when a hybrid diesel vehicle has DEF/AdBlue equipment.'),
  ('def_adblue_check_refill', 3, null, 'gasoline', null, null, null, null, 'exclude', 'Gasoline vehicles should not receive diesel-only DEF/AdBlue maintenance.'),
  ('def_adblue_check_refill', 4, null, 'hybrid_gasoline', null, null, null, null, 'exclude', 'Hybrid gasoline vehicles should not receive diesel-only DEF/AdBlue maintenance.'),
  ('def_adblue_check_refill', 5, null, 'full_ev', null, null, null, null, 'exclude', 'Full EVs should not receive diesel-only DEF/AdBlue maintenance.'),
  ('dpf_inspection', 1, null, 'diesel', null, null, 'diesel_particulate_filter', null, 'include', 'Applies when a diesel vehicle has a DPF feature.'),
  ('dpf_inspection', 2, null, 'hybrid_diesel', null, null, 'diesel_particulate_filter', null, 'include', 'Applies when a hybrid diesel vehicle has a DPF feature.'),
  ('dpf_inspection', 3, null, 'gasoline', null, null, null, null, 'exclude', 'Gasoline vehicles should not receive DPF maintenance by default.'),
  ('dpf_inspection', 4, null, 'hybrid_gasoline', null, null, null, null, 'exclude', 'Hybrid gasoline vehicles should not receive DPF maintenance by default.'),
  ('dpf_inspection', 5, null, 'full_ev', null, null, null, null, 'exclude', 'Full EVs do not use diesel particulate filters.'),
  ('transmission_fluid_change', 1, null, null, 'automatic', null, null, null, 'include', 'Automatic transmission fluid maintenance.'),
  ('transmission_fluid_change', 2, null, null, 'cvt', null, null, null, 'include', 'CVT fluid maintenance.'),
  ('transmission_fluid_change', 3, null, null, 'dct', null, null, null, 'include', 'DCT fluid maintenance.'),
  ('transmission_fluid_change', 4, null, null, 'manual', null, null, null, 'exclude', 'Manual transmissions use gear oil and clutch templates.'),
  ('transmission_fluid_change', 5, null, null, 'none', null, null, null, 'exclude', 'No transmission fluid template applies.'),
  ('manual_transmission_gear_oil', 1, null, null, 'manual', null, null, null, 'include', 'Manual transmission gear oil maintenance.'),
  ('manual_clutch_inspection', 1, null, null, 'manual', null, null, null, 'include', 'Manual transmission vehicles use a clutch.'),
  ('manual_clutch_inspection', 2, null, null, 'automatic', null, null, null, 'exclude', 'Automatic vehicles do not use a manual clutch.'),
  ('manual_clutch_inspection', 3, null, null, 'cvt', null, null, null, 'exclude', 'CVT vehicles do not use a manual clutch.'),
  ('manual_clutch_inspection', 4, null, null, 'dct', null, null, null, 'exclude', 'DCT vehicles do not use a manual clutch.'),
  ('manual_clutch_inspection', 5, null, null, 'none', null, null, null, 'exclude', 'No manual clutch applies.'),
  ('differential_oil_change', 1, null, null, null, 'rwd', null, null, 'include', 'RWD drivetrain differential maintenance.'),
  ('differential_oil_change', 2, null, null, null, 'awd', null, null, 'include', 'AWD drivetrain differential maintenance.'),
  ('differential_oil_change', 3, null, null, null, '4wd', null, null, 'include', '4WD drivetrain differential maintenance.'),
  ('transfer_case_fluid_change', 1, null, null, null, 'awd', null, null, 'include', 'AWD transfer case maintenance.'),
  ('transfer_case_fluid_change', 2, null, null, null, '4wd', null, null, 'include', '4WD transfer case maintenance.'),
  ('transfer_case_fluid_change', 3, null, null, null, 'fwd', null, null, 'exclude', 'FWD vehicles should not receive transfer case maintenance by default.'),
  ('transfer_case_fluid_change', 4, null, null, null, 'rwd', null, null, 'exclude', 'RWD vehicles should not receive transfer case maintenance by default.'),
  ('exhaust_inspection', 1, null, 'gasoline', null, null, null, null, 'include', 'Gasoline combustion maintenance.'),
  ('exhaust_inspection', 2, null, 'diesel', null, null, null, null, 'include', 'Diesel combustion maintenance.'),
  ('exhaust_inspection', 3, null, 'hybrid_gasoline', null, null, null, null, 'include', 'Hybrid gasoline combustion maintenance.'),
  ('exhaust_inspection', 4, null, 'hybrid_diesel', null, null, null, null, 'include', 'Hybrid diesel combustion maintenance.'),
  ('exhaust_inspection', 5, null, 'full_ev', null, null, null, null, 'exclude', 'Full EVs do not use exhaust systems.'),
  ('timing_belt_inspection_replacement', 1, null, null, null, null, 'timing_belt', null, 'include', 'Applies only when the timing belt feature is selected.'),
  ('timing_chain_inspection', 1, null, null, null, null, 'timing_chain', null, 'include', 'Applies only when the timing chain feature is selected.'),
  ('turbocharger_inspection', 1, null, null, null, null, 'turbocharged', null, 'include', 'Applies only when the turbocharged feature is selected.'),
  ('hybrid_battery_health_check', 1, null, 'hybrid_gasoline', null, null, null, null, 'include', 'Hybrid gasoline vehicle maintenance.'),
  ('hybrid_battery_health_check', 2, null, 'hybrid_diesel', null, null, null, null, 'include', 'Hybrid diesel vehicle maintenance.'),
  ('hybrid_battery_health_check', 3, null, null, null, null, 'hybrid_system', null, 'include', 'Applies when the hybrid system feature is selected.'),
  ('ev_battery_health_check', 1, null, 'full_ev', null, null, null, null, 'include', 'Full EV high-voltage battery maintenance.'),
  ('ev_battery_health_check', 2, null, null, null, null, 'electric_motor_system', null, 'include', 'Applies when the electric motor system feature is selected.')
) as seed(template_key, sort_order, vehicle_type, fuel_type,
                 transmission_type, drivetrain, requires_feature,
                 excludes_feature, rule_type, notes)
join public.maintenance_templates t on t.template_key = seed.template_key
where not exists (
  select 1 from public.maintenance_template_rules existing
  where existing.template_id = t.id
);
