-- Is this piece of maintenance due?
--
-- A direct port of evaluate_due_status from the desktop app
-- (src-tauri/src/maintenance/scheduling.rs:580). It lives in the database
-- rather than in the client for two reasons: the dashboard evaluates it over
-- every schedule in the fleet at once, and four different callers have to
-- agree on the answer. One copy, in the place the data already is.
--
-- The reason strings are shown to people, so they are reproduced exactly.

-- Guarded so that re-applying this file is a no-op, which every other
-- statement in it already is.
do $do$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'due_evaluation'
  ) then
    create type public.due_evaluation as (
    status text,
    reason text,
    alert_type text
    );
  end if;
end $do$;

-- "1,200 km" not "1200.0 km", but "1,200.5 km" when the halves matter.
create or replace function public.format_km(value numeric)
returns text
language sql
immutable
as $$
  select case
    when round(value) = value then round(value)::bigint::text
    else to_char(value, 'FM999999999990.0')
  end;
$$;

create or replace function public.evaluate_due_status(
  today date,
  current_odometer numeric,
  next_due_date date,
  next_due_odometer numeric,
  due_soon_days integer,
  due_soon_km integer,
  disabled boolean
)
returns public.due_evaluation
language plpgsql
immutable
as $$
declare
  threshold_days integer := greatest(coalesce(due_soon_days, 0), 0);
  threshold_km numeric := greatest(coalesce(due_soon_km, 0), 0);
  days_until_due integer;
  remaining_km numeric;
  best_rank integer := 0;
  result public.due_evaluation;
begin
  if coalesce(disabled, false) then
    return row(
      'disabled',
      'Disabled schedule does not generate alerts.',
      null
    )::public.due_evaluation;
  end if;

  -- Due by date.
  if today is not null and next_due_date is not null then
    days_until_due := next_due_date - today;

    if days_until_due < 0 then
      best_rank := 4;
      result := row('overdue',
                    format('Overdue by %s days.', abs(days_until_due)),
                    'overdue_by_date')::public.due_evaluation;
    elsif days_until_due = 0 then
      best_rank := 3;
      result := row('due_today', 'Due today.', 'due_soon_by_date')::public.due_evaluation;
    elsif days_until_due <= threshold_days then
      best_rank := 2;
      result := row('due_soon',
                    format('Due in %s days.', days_until_due),
                    'due_soon_by_date')::public.due_evaluation;
    else
      best_rank := 1;
      result := row('not_due',
                    format('Due in %s days.', days_until_due),
                    null)::public.due_evaluation;
    end if;
  end if;

  -- Due by odometer. On an equal rank this one wins, matching the Rust
  -- original: max_by_key returns the *last* maximum, and the odometer
  -- candidate was pushed second. So a schedule overdue on both counts reports
  -- overdue_by_odometer.
  if next_due_odometer is not null and current_odometer is not null then
    remaining_km := next_due_odometer - current_odometer;

    if remaining_km <= 0 and best_rank <= 4 then
      best_rank := 4;
      result := row('overdue',
                    format('Overdue by %s km.', public.format_km(abs(remaining_km))),
                    'overdue_by_odometer')::public.due_evaluation;
    elsif remaining_km <= threshold_km and best_rank <= 2 then
      best_rank := 2;
      result := row('due_soon',
                    format('Due in %s km.', public.format_km(remaining_km)),
                    'due_soon_by_odometer')::public.due_evaluation;
    elsif remaining_km > threshold_km and best_rank <= 1 then
      best_rank := 1;
      result := row('not_due',
                    format('Due in %s km.', public.format_km(remaining_km)),
                    null)::public.due_evaluation;
    end if;
  end if;

  if best_rank = 0 then
    return row(
      'needs_setup',
      'Needs setup: no due date or odometer target is set.',
      null
    )::public.due_evaluation;
  end if;

  return result;
end;
$$;

comment on function public.evaluate_due_status is
  'Ported from scheduling.rs:580. Ranks: overdue 4, due today 3, due soon 2, not due 1. The odometer reading wins ties.';

-- ---------------------------------------------------------------------------
-- What an alert made from an evaluation looks like
-- ---------------------------------------------------------------------------

create or replace function public.alert_priority(schedule_priority text, status text)
returns text
language sql
immutable
as $$
  select case status
    when 'overdue' then 'critical'
    when 'due_today' then 'high'
    else schedule_priority
  end;
$$;

create or replace function public.alert_title_status(status text)
returns text
language sql
immutable
as $$
  select case status
    when 'overdue' then 'overdue'
    when 'due_today' then 'due today'
    when 'due_soon' then 'due soon'
    else 'needs attention'
  end;
$$;
