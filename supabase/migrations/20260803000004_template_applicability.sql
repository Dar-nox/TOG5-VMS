-- Does this piece of maintenance apply to this vehicle?
--
-- A port of evaluate_template from src-tauri/src/maintenance/repository.rs:784.
-- The specs call this the most important idea in the project: maintenance must
-- adapt to the vehicle rather than assuming every van is a diesel van. A
-- diesel engine must never be told to change its spark plugs, and an electric
-- one must never be told to change its oil.
--
-- Five outcomes, in strict precedence:
--
--   1. excluded         a matching exclude rule, which beats everything
--   2. applicable       no include rules at all, so it is universal
--   3. applicable       at least one include rule matches
--   4. requires_feature an include rule would match but for a missing feature
--   5. not_applicable   nothing matched
--
-- The asymmetry in step 4 is deliberate and is in the original: the fallback
-- match ignores requires_feature but still honours excludes_feature.

create type public.template_applicability as (
  applicability_status text,
  is_auto_applicable boolean,
  reason text,
  warnings text[],
  matched_rule_ids uuid[]
);

-- A rule dimension is either "any" (null) or an exact match.
create or replace function public.rule_field_matches(rule_value text, vehicle_value text)
returns boolean
language sql
immutable
as $$
  select rule_value is null or rule_value = vehicle_value;
$$;

-- "diesel_particulate_filter" reads as "diesel particulate filter".
create or replace function public.feature_label(feature text)
returns text
language sql
immutable
as $$
  select replace(feature, '_', ' ');
$$;

create or replace function public.evaluate_template_applicability(
  template_id uuid,
  vehicle_type text,
  fuel_type text,
  transmission_type text,
  drivetrain text,
  enabled_features text[]
)
returns public.template_applicability
language plpgsql
stable
as $$
declare
  features text[] := coalesce(enabled_features, array[]::text[]);
  matching_excludes record;
  include_count integer;
  matching_includes record;
  blocked_by_feature text;
begin
  -- 1. A matching exclude rule wins outright. The explanation comes from the
  --    first such rule; every matching exclude is reported as evidence.
  select
    (array_agg(r.id order by r.sort_order, r.id))[1] as first_id,
    (array_agg(r.notes order by r.sort_order, r.id))[1] as first_notes,
    array_agg(r.id order by r.sort_order, r.id) as ids,
    count(*) as total
  into matching_excludes
  from public.maintenance_template_rules r
  where r.template_id = evaluate_template_applicability.template_id
    and r.rule_type = 'exclude'
    and public.rule_field_matches(r.applies_to_vehicle_type, vehicle_type)
    and public.rule_field_matches(r.applies_to_fuel_type, fuel_type)
    and public.rule_field_matches(r.applies_to_transmission_type, transmission_type)
    and public.rule_field_matches(r.applies_to_drivetrain, drivetrain)
    and (r.requires_feature is null or r.requires_feature = any(features))
    and (r.excludes_feature is null or not (r.excludes_feature = any(features)));

  if coalesce(matching_excludes.total, 0) > 0 then
    return row(
      'excluded',
      false,
      coalesce(matching_excludes.first_notes,
               'This template is excluded for the selected vehicle.'),
      array['Not auto-applied for this vehicle.'],
      matching_excludes.ids
    )::public.template_applicability;
  end if;

  -- 2. No include rules means the template applies to everything.
  select count(*) into include_count
  from public.maintenance_template_rules r
  where r.template_id = evaluate_template_applicability.template_id
    and r.rule_type = 'include';

  if include_count = 0 then
    return row(
      'applicable',
      true,
      'Universal template for most vehicles.',
      array[]::text[],
      array[]::uuid[]
    )::public.template_applicability;
  end if;

  -- 3. Any matching include rule makes it applicable.
  select
    (array_agg(r.notes order by r.sort_order, r.id))[1] as first_notes,
    array_agg(r.id order by r.sort_order, r.id) as ids,
    count(*) as total
  into matching_includes
  from public.maintenance_template_rules r
  where r.template_id = evaluate_template_applicability.template_id
    and r.rule_type = 'include'
    and public.rule_field_matches(r.applies_to_vehicle_type, vehicle_type)
    and public.rule_field_matches(r.applies_to_fuel_type, fuel_type)
    and public.rule_field_matches(r.applies_to_transmission_type, transmission_type)
    and public.rule_field_matches(r.applies_to_drivetrain, drivetrain)
    and (r.requires_feature is null or r.requires_feature = any(features))
    and (r.excludes_feature is null or not (r.excludes_feature = any(features)));

  if coalesce(matching_includes.total, 0) > 0 then
    return row(
      'applicable',
      true,
      coalesce(matching_includes.first_notes, 'Matches the selected vehicle profile.'),
      array[]::text[],
      matching_includes.ids
    )::public.template_applicability;
  end if;

  -- 4. An include rule that would have matched but for a feature the vehicle
  --    has not been marked as having. Note requires_feature is ignored here
  --    while excludes_feature is still honoured — same as the original.
  select r.requires_feature into blocked_by_feature
  from public.maintenance_template_rules r
  where r.template_id = evaluate_template_applicability.template_id
    and r.rule_type = 'include'
    and r.requires_feature is not null
    and public.rule_field_matches(r.applies_to_vehicle_type, vehicle_type)
    and public.rule_field_matches(r.applies_to_fuel_type, fuel_type)
    and public.rule_field_matches(r.applies_to_transmission_type, transmission_type)
    and public.rule_field_matches(r.applies_to_drivetrain, drivetrain)
    and (r.excludes_feature is null or not (r.excludes_feature = any(features)))
  order by r.sort_order, r.id
  limit 1;

  if blocked_by_feature is not null then
    return row(
      'requires_feature',
      false,
      format('Requires vehicle feature: %s.', public.feature_label(blocked_by_feature)),
      array['Add the matching vehicle feature before auto-applying this template.'],
      array[]::uuid[]
    )::public.template_applicability;
  end if;

  -- 5. Nothing matched.
  return row(
    'not_applicable',
    false,
    'Rules do not match the selected vehicle profile.',
    array[]::text[],
    array[]::uuid[]
  )::public.template_applicability;
end;
$$;

comment on function public.evaluate_template_applicability is
  'Ported from maintenance/repository.rs:784. Precedence: excluded, universal, matched include, requires_feature, not applicable.';

-- Convenience wrapper: read the vehicle's profile and features from the tables
-- rather than making every caller assemble them.
create or replace function public.evaluate_template_for_vehicle(
  template_id uuid,
  vehicle_id uuid
)
returns public.template_applicability
language sql
stable
as $$
  select public.evaluate_template_applicability(
    template_id,
    v.vehicle_type,
    v.fuel_type,
    coalesce(v.transmission_type, ''),
    coalesce(v.drivetrain, ''),
    coalesce(
      (select array_agg(f.feature_key)
       from public.vehicle_features f
       where f.vehicle_id = v.id and f.enabled),
      array[]::text[]
    )
  )
  from public.vehicles v
  where v.id = vehicle_id;
$$;
