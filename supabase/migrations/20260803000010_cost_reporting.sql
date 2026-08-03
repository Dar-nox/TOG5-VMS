-- What the fleet costs.
--
-- Ported from src-tauri/src/expenses/repository.rs. Costs come from four
-- places — fuel, maintenance, repairs, and expenses somebody typed in — and
-- the reports have to add them up without counting anything twice.
--
-- The double-counting rule is the important one, and in the desktop app it was
-- implemented three separate times in three files. Here it is a view, so there
-- is one copy to be wrong.

-- An expense that points at a fuel log, a service record, or a repair is a
-- duplicate of a cost already counted from its source. Only expenses that
-- stand alone are counted.
create or replace view public.standalone_expenses as
  select e.*
  from public.expenses e
  where e.deleted_at is null
    and (
      e.related_record_type is null
      or e.related_record_id is null
      or e.related_record_type not in ('fuel_log', 'maintenance_log', 'repair_record')
    );

comment on view public.standalone_expenses is
  'Expenses that are not a re-entry of a cost already recorded elsewhere. Every cost total must come from here rather than from expenses directly.';

-- Every cost the fleet has incurred, from all four sources, in one shape.
create or replace view public.cost_events as
  select
    'fuel'::text as source_type,
    f.id as source_id,
    f.vehicle_id,
    v.vehicle_name,
    f.fuel_date::date as event_date,
    'fuel'::text as category,
    coalesce(nullif(f.station_name, ''), 'Fuel purchase') as description,
    f.total_amount as amount
  from public.fuel_logs f
  left join public.vehicles v on v.id = f.vehicle_id
  where f.deleted_at is null

  union all

  select
    'maintenance',
    m.id,
    m.vehicle_id,
    v.vehicle_name,
    m.completed_date,
    'maintenance',
    coalesce(nullif(t.name, ''), nullif(m.work_performed, ''), 'Maintenance'),
    m.total_cost
  from public.maintenance_logs m
  left join public.vehicles v on v.id = m.vehicle_id
  left join public.maintenance_templates t on t.id = m.template_id
  where m.deleted_at is null

  union all

  select
    'repair',
    r.id,
    r.vehicle_id,
    v.vehicle_name,
    r.repair_date,
    'repair',
    coalesce(nullif(r.issue_description, ''), 'Repair'),
    r.total_cost
  from public.repair_records r
  left join public.vehicles v on v.id = r.vehicle_id
  where r.deleted_at is null

  union all

  select
    'expense',
    e.id,
    e.vehicle_id,
    v.vehicle_name,
    e.expense_date,
    e.category,
    e.description,
    e.amount
  from public.standalone_expenses e
  left join public.vehicles v on v.id = e.vehicle_id;

-- ---------------------------------------------------------------------------
-- Distance, for cost per kilometre
-- ---------------------------------------------------------------------------

-- The span between the lowest and highest odometer reading recorded for a
-- vehicle in the period, from any source. Null when there is nothing to
-- measure — one reading is not a distance.
create or replace function public.cost_distance_for_vehicle(
  vehicle_id uuid,
  start_date date default null,
  end_date date default null
)
returns numeric
language sql
stable
as $$
  with readings as (
    select f.odometer, f.fuel_date::date as event_date
    from public.fuel_logs f
    where f.vehicle_id = cost_distance_for_vehicle.vehicle_id and f.deleted_at is null
    union all
    select m.odometer, m.completed_date
    from public.maintenance_logs m
    where m.vehicle_id = cost_distance_for_vehicle.vehicle_id and m.deleted_at is null
    union all
    select r.odometer, r.repair_date
    from public.repair_records r
    where r.vehicle_id = cost_distance_for_vehicle.vehicle_id
      and r.deleted_at is null and r.odometer is not null
  ),
  bounds as (
    select min(odometer) as lowest, max(odometer) as highest
    from readings
    where (start_date is null or event_date >= start_date)
      and (end_date is null or event_date <= end_date)
  )
  select case when highest > lowest then highest - lowest end from bounds;
$$;

-- ---------------------------------------------------------------------------
-- The reports themselves
-- ---------------------------------------------------------------------------

create or replace function public.vehicle_cost_summary(
  start_date date default null,
  end_date date default null
)
returns table (
  vehicle_id uuid,
  vehicle_name text,
  fuel_total numeric,
  maintenance_total numeric,
  repair_total numeric,
  expense_total numeric,
  grand_total numeric,
  distance_km numeric,
  cost_per_km numeric,
  cost_per_km_note text
)
language sql
stable
as $$
  select
    v.id,
    v.vehicle_name,
    coalesce(sum(c.amount) filter (where c.source_type = 'fuel'), 0),
    coalesce(sum(c.amount) filter (where c.source_type = 'maintenance'), 0),
    coalesce(sum(c.amount) filter (where c.source_type = 'repair'), 0),
    coalesce(sum(c.amount) filter (where c.source_type = 'expense'), 0),
    coalesce(sum(c.amount), 0),
    d.distance,
    case when d.distance is not null and d.distance > 0
         then round(coalesce(sum(c.amount), 0) / d.distance, 2) end,
    case when d.distance is null
         then 'Needs at least two cost records with different odometer readings.' end
  from public.vehicles v
  left join public.cost_events c
    on c.vehicle_id = v.id
   and (start_date is null or c.event_date >= start_date)
   and (end_date is null or c.event_date <= end_date)
  cross join lateral (
    select public.cost_distance_for_vehicle(v.id, start_date, end_date) as distance
  ) d
  where v.deleted_at is null
  group by v.id, v.vehicle_name, d.distance
  order by v.vehicle_name;
$$;

create or replace function public.cost_totals_by_category(
  vehicle_id uuid default null,
  start_date date default null,
  end_date date default null
)
returns table (category text, total numeric)
language sql
stable
as $$
  select c.category, round(sum(c.amount), 2)
  from public.cost_events c
  where (cost_totals_by_category.vehicle_id is null
         or c.vehicle_id = cost_totals_by_category.vehicle_id)
    and (start_date is null or c.event_date >= start_date)
    and (end_date is null or c.event_date <= end_date)
  group by c.category
  order by sum(c.amount) desc;
$$;

create or replace function public.cost_totals_by_month(
  vehicle_id uuid default null,
  start_date date default null,
  end_date date default null
)
returns table (month text, total numeric)
language sql
stable
as $$
  select to_char(c.event_date, 'YYYY-MM'), round(sum(c.amount), 2)
  from public.cost_events c
  where (cost_totals_by_month.vehicle_id is null
         or c.vehicle_id = cost_totals_by_month.vehicle_id)
    and (start_date is null or c.event_date >= start_date)
    and (end_date is null or c.event_date <= end_date)
  group by to_char(c.event_date, 'YYYY-MM')
  order by to_char(c.event_date, 'YYYY-MM') desc;
$$;

-- ---------------------------------------------------------------------------
-- Trips
-- ---------------------------------------------------------------------------

-- The desktop app flattened drivers, passengers, and destinations into arrays
-- on each trip. Three joins per trip over a network would be slow, so the
-- flattening happens here.
create or replace view public.trips_with_people as
  select
    t.*,
    coalesce((select array_agg(d.driver_name order by d.sort_order, d.created_at)
              from public.trip_drivers d
              where d.trip_id = t.id and d.deleted_at is null), array[]::text[]) as drivers,
    coalesce((select array_agg(p.passenger_name order by p.sort_order, p.created_at)
              from public.trip_passengers p
              where p.trip_id = t.id and p.deleted_at is null), array[]::text[]) as passengers,
    coalesce((select array_agg(x.destination_name order by x.sort_order, x.created_at)
              from public.trip_destinations x
              where x.trip_id = t.id and x.deleted_at is null), array[]::text[]) as destinations,
    v.vehicle_name
  from public.trips t
  left join public.vehicles v on v.id = t.vehicle_id
  where t.deleted_at is null;

create or replace function public.trip_top_counts(
  which text,
  start_date date default null,
  end_date date default null,
  limit_to integer default 10
)
returns table (name text, trip_count bigint)
language sql
stable
as $$
  select person, count(*)
  from (
    select unnest(
             case which
               when 'drivers' then t.drivers
               when 'passengers' then t.passengers
               else t.destinations
             end
           ) as person
    from public.trips_with_people t
    where (start_date is null or t.departure_time::date >= start_date)
      and (end_date is null or t.departure_time::date <= end_date)
  ) expanded
  group by person
  order by count(*) desc, person
  limit limit_to;
$$;
