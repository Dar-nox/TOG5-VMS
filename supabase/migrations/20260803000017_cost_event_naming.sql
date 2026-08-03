-- Cost events, named the way the app already expects.
--
-- The first version of this view invented its own source names ('fuel',
-- 'maintenance', 'repair'). The desktop app used 'fuel_log',
-- 'maintenance_log' and 'repair_record', and the screens switch on those
-- values, so the view has to match rather than the other way round.
--
-- The categories are the desktop's too: fuel, preventive_maintenance, and
-- repairs. They appear in the reports as grouping labels, so inventing new
-- ones would silently split a client's history into two piles.

create or replace view public.cost_events as
  select
    'fuel_log'::text as source_type,
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
    'maintenance_log',
    m.id,
    m.vehicle_id,
    v.vehicle_name,
    m.completed_date,
    'preventive_maintenance',
    coalesce(nullif(t.name, ''), nullif(m.work_performed, ''), 'Maintenance'),
    m.total_cost
  from public.maintenance_logs m
  left join public.vehicles v on v.id = m.vehicle_id
  left join public.maintenance_templates t on t.id = m.template_id
  where m.deleted_at is null

  union all

  select
    'repair_record',
    r.id,
    r.vehicle_id,
    v.vehicle_name,
    r.repair_date,
    'repairs',
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

alter view public.cost_events set (security_invoker = on);

-- The summaries built on it have to follow. The column names changed, which
-- is a signature change, so the old one is dropped rather than replaced.
drop function if exists public.vehicle_cost_summary(date, date);

create function public.vehicle_cost_summary(
  start_date date default null,
  end_date date default null
)
returns table (
  vehicle_id uuid,
  vehicle_name text,
  fuel_total numeric,
  maintenance_total numeric,
  repair_total numeric,
  manual_expense_total numeric,
  total_cost numeric,
  distance_km numeric,
  cost_per_km numeric,
  cost_per_km_reason text,
  latest_official_km_per_liter numeric
)
language sql
stable
as $$
  select
    v.id,
    v.vehicle_name,
    coalesce(sum(c.amount) filter (where c.source_type = 'fuel_log'), 0),
    coalesce(sum(c.amount) filter (where c.source_type = 'maintenance_log'), 0),
    coalesce(sum(c.amount) filter (where c.source_type = 'repair_record'), 0),
    coalesce(sum(c.amount) filter (where c.source_type = 'expense'), 0),
    coalesce(sum(c.amount), 0),
    d.distance,
    case when d.distance is not null and d.distance > 0
         then round(coalesce(sum(c.amount), 0) / d.distance, 2) end,
    case when d.distance is null
         then 'Needs at least two cost records with different odometer readings.'
         else '' end,
    (select f.computed_km_per_liter
     from public.fuel_logs f
     where f.vehicle_id = v.id and f.deleted_at is null
       and f.efficiency_status = 'official' and f.computed_km_per_liter is not null
     order by f.fuel_date desc, f.created_at desc
     limit 1)
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

-- ---------------------------------------------------------------------------
-- The three report shapes the screens read
-- ---------------------------------------------------------------------------

-- An expense that mirrors a fuel log or a service record is "linked". The
-- desktop app reported all three figures separately — everything typed in,
-- the part that duplicates something else, and the part that does not — so
-- somebody can see how much of their expense list is double entry.
create or replace function public.expense_summary(
  vehicle_id uuid default null,
  category text default null,
  start_date date default null,
  end_date date default null
)
returns jsonb
language sql
stable
as $$
  with scoped as (
    select e.*
    from public.expenses_detailed e
    where (expense_summary.vehicle_id is null or e.vehicle_id = expense_summary.vehicle_id)
      and (expense_summary.category is null or e.category = expense_summary.category)
      and (start_date is null or e.expense_date >= start_date)
      and (end_date is null or e.expense_date <= end_date)
  ),
  split as (
    select *,
           related_record_type in ('fuel_log', 'maintenance_log', 'repair_record')
             and related_record_id is not null as is_linked
    from scoped
  )
  select jsonb_build_object(
    'directExpenseTotal', coalesce((select round(sum(amount), 2) from split), 0),
    'linkedExpenseTotal',
      coalesce((select round(sum(amount), 2) from split where is_linked), 0),
    'manualExpenseTotal',
      coalesce((select round(sum(amount), 2) from split where not is_linked), 0),
    'expenseCount', (select count(*) from split),
    'categoryTotals', coalesce((
      select jsonb_agg(jsonb_build_object('category', category, 'total', total, 'count', c)
                       order by total desc, category)
      from (select category, round(sum(amount), 2) as total, count(*) as c
            from split group by category) t
    ), '[]'::jsonb),
    'monthlyTotals', coalesce((
      select jsonb_agg(jsonb_build_object('month', month_key, 'total', total, 'count', c)
                       order by month_key desc)
      from (select to_char(expense_date, 'YYYY-MM') as month_key,
                   round(sum(amount), 2) as total, count(*) as c
            from split group by to_char(expense_date, 'YYYY-MM')) t
    ), '[]'::jsonb),
    'recentExpenses', coalesce((
      select jsonb_agg(to_jsonb(r) order by r.expense_date desc, r.created_at desc)
      from (select * from scoped order by expense_date desc, created_at desc limit 8) r
    ), '[]'::jsonb)
  );
$$;

create or replace function public.reports_overview(
  vehicle_id uuid default null,
  start_date date default null,
  end_date date default null
)
returns jsonb
language sql
stable
as $$
  with events as (
    select c.*
    from public.cost_events c
    where (reports_overview.vehicle_id is null or c.vehicle_id = reports_overview.vehicle_id)
      and (start_date is null or c.event_date >= start_date)
      and (end_date is null or c.event_date <= end_date)
  ),
  all_expenses as (
    select e.amount,
           e.related_record_type in ('fuel_log', 'maintenance_log', 'repair_record')
             and e.related_record_id is not null as is_linked
    from public.expenses e
    where e.deleted_at is null
      and (reports_overview.vehicle_id is null or e.vehicle_id = reports_overview.vehicle_id)
      and (start_date is null or e.expense_date >= start_date)
      and (end_date is null or e.expense_date <= end_date)
  )
  select jsonb_build_object(
    'totalTrackedCost', coalesce((select round(sum(amount), 2) from events), 0),
    'fuelTotal',
      coalesce((select round(sum(amount), 2) from events where source_type = 'fuel_log'), 0),
    'maintenanceTotal',
      coalesce((select round(sum(amount), 2) from events where source_type = 'maintenance_log'), 0),
    'repairTotal',
      coalesce((select round(sum(amount), 2) from events where source_type = 'repair_record'), 0),
    'manualExpenseTotal',
      coalesce((select round(sum(amount), 2) from events where source_type = 'expense'), 0),
    'directExpenseTotal', coalesce((select round(sum(amount), 2) from all_expenses), 0),
    'linkedExpenseTotal',
      coalesce((select round(sum(amount), 2) from all_expenses where is_linked), 0),
    'categoryTotals', coalesce((
      select jsonb_agg(jsonb_build_object('category', category, 'total', total, 'count', c)
                       order by total desc, category)
      from (select category, round(sum(amount), 2) as total, count(*) as c
            from events group by category) t
    ), '[]'::jsonb),
    'monthlyTotals', coalesce((
      select jsonb_agg(jsonb_build_object('month', month_key, 'total', total, 'count', c)
                       order by month_key desc)
      from (select to_char(event_date, 'YYYY-MM') as month_key,
                   round(sum(amount), 2) as total, count(*) as c
            from events group by to_char(event_date, 'YYYY-MM')) t
    ), '[]'::jsonb),
    'vehicleSummaries', coalesce((
      select jsonb_agg(to_jsonb(s) order by s.vehicle_name)
      from public.vehicle_cost_summary(start_date, end_date) s
      where reports_overview.vehicle_id is null or s.vehicle_id = reports_overview.vehicle_id
    ), '[]'::jsonb),
    'recentCostEvents', coalesce((
      select jsonb_agg(to_jsonb(r) order by r.event_date desc, r.source_id desc)
      from (select * from events order by event_date desc, source_id desc limit 10) r
    ), '[]'::jsonb)
  );
$$;

create or replace function public.vehicle_cost_report(
  vehicle_id uuid,
  start_date date default null,
  end_date date default null
)
returns jsonb
language sql
stable
as $$
  with events as (
    select c.*
    from public.cost_events c
    where c.vehicle_id = vehicle_cost_report.vehicle_id
      and (start_date is null or c.event_date >= start_date)
      and (end_date is null or c.event_date <= end_date)
  )
  select jsonb_build_object(
    'vehicle', (
      select to_jsonb(s) from public.vehicle_cost_summary(start_date, end_date) s
      where s.vehicle_id = vehicle_cost_report.vehicle_id
    ),
    'categoryTotals', coalesce((
      select jsonb_agg(jsonb_build_object('category', category, 'total', total, 'count', c)
                       order by total desc, category)
      from (select category, round(sum(amount), 2) as total, count(*) as c
            from events group by category) t
    ), '[]'::jsonb),
    'monthlyTotals', coalesce((
      select jsonb_agg(jsonb_build_object('month', month_key, 'total', total, 'count', c)
                       order by month_key desc)
      from (select to_char(event_date, 'YYYY-MM') as month_key,
                   round(sum(amount), 2) as total, count(*) as c
            from events group by to_char(event_date, 'YYYY-MM')) t
    ), '[]'::jsonb),
    'recentCostEvents', coalesce((
      select jsonb_agg(to_jsonb(r) order by r.event_date desc, r.source_id desc)
      from (select * from events order by event_date desc, source_id desc limit 10) r
    ), '[]'::jsonb)
  );
$$;
