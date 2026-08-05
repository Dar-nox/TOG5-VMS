-- What "due" means.
--
-- These are the cases the desktop app pinned in
-- src-tauri/src/maintenance/scheduling.rs, plus the reason strings, which the
-- Rust tests never checked but people read on screen every day.

do $$
declare
  e public.due_evaluation;
begin
  -- ----------------------------------------------------------------------
  -- By date
  -- ----------------------------------------------------------------------
  e := public.evaluate_due_status('2026-01-01', 1000, '2026-02-01', null, 14, 500, false);
  assert e.status = 'not_due', 'a month away is not due yet, got ' || e.status;
  assert e.reason = 'Due in 31 days.', 'unexpected reason: ' || e.reason;
  assert e.alert_type is null, 'nothing that is not due should raise an alert';

  e := public.evaluate_due_status('2026-01-01', 1000, '2026-01-10', null, 14, 500, false);
  assert e.status = 'due_soon', 'nine days away is due soon, got ' || e.status;
  assert e.reason = 'Due in 9 days.', 'unexpected reason: ' || e.reason;
  assert e.alert_type = 'due_soon_by_date', 'unexpected alert type: ' || e.alert_type;

  e := public.evaluate_due_status('2026-01-01', 1000, '2026-01-01', null, 14, 500, false);
  assert e.status = 'due_today', 'today is due today, got ' || e.status;
  assert e.reason = 'Due today.', 'unexpected reason: ' || e.reason;
  assert e.alert_type = 'due_soon_by_date', 'due today still alerts as due soon by date';

  e := public.evaluate_due_status('2026-01-01', 1000, '2025-12-31', null, 14, 500, false);
  assert e.status = 'overdue', 'yesterday is overdue, got ' || e.status;
  assert e.reason = 'Overdue by 1 days.', 'unexpected reason: ' || e.reason;
  assert e.alert_type = 'overdue_by_date', 'unexpected alert type: ' || e.alert_type;

  -- The boundary: exactly at the threshold is still due soon, one day past it
  -- is not. Off by one here means reminders arrive a day late for ever.
  e := public.evaluate_due_status('2026-01-01', 1000, '2026-01-15', null, 14, 500, false);
  assert e.status = 'due_soon', 'exactly the threshold is due soon, got ' || e.status;
  e := public.evaluate_due_status('2026-01-01', 1000, '2026-01-16', null, 14, 500, false);
  assert e.status = 'not_due', 'one day past the threshold is not due, got ' || e.status;

  -- ----------------------------------------------------------------------
  -- By odometer
  -- ----------------------------------------------------------------------
  e := public.evaluate_due_status('2026-01-01', 1000, null, 1300, 14, 500, false);
  assert e.status = 'due_soon', '300 km to go is due soon, got ' || e.status;
  assert e.reason = 'Due in 300 km.', 'unexpected reason: ' || e.reason;
  assert e.alert_type = 'due_soon_by_odometer', 'unexpected alert type: ' || e.alert_type;

  e := public.evaluate_due_status('2026-01-01', 1500, null, 1500, 14, 500, false);
  assert e.status = 'overdue', 'reaching the target exactly is overdue, got ' || e.status;
  assert e.reason = 'Overdue by 0 km.', 'unexpected reason: ' || e.reason;

  e := public.evaluate_due_status('2026-01-01', 1000, null, 2000, 14, 500, false);
  assert e.status = 'not_due', '1000 km to go is not due, got ' || e.status;

  -- Half kilometres print with one decimal, whole ones without.
  e := public.evaluate_due_status('2026-01-01', 1000, null, 1300.5, 14, 500, false);
  assert e.reason = 'Due in 300.5 km.', 'unexpected reason: ' || e.reason;

  -- ----------------------------------------------------------------------
  -- Nothing set, and switched off
  -- ----------------------------------------------------------------------
  e := public.evaluate_due_status('2026-01-01', 1000, null, null, 14, 500, false);
  assert e.status = 'needs_setup', 'no target at all needs setup, got ' || e.status;
  assert e.alert_type is null, 'an unconfigured reminder must not alert';

  e := public.evaluate_due_status('2026-01-01', 1000, '2020-01-01', 0, 14, 500, true);
  assert e.status = 'disabled', 'a disabled reminder is disabled however overdue it looks';
  assert e.alert_type is null, 'a disabled reminder must never alert';

  -- ----------------------------------------------------------------------
  -- When the two disagree
  -- ----------------------------------------------------------------------
  -- Overdue on distance beats due-soon on date.
  e := public.evaluate_due_status('2026-01-01', 1500, '2026-01-10', 1400, 14, 500, false);
  assert e.status = 'overdue', 'the worse of the two wins, got ' || e.status;
  assert e.alert_type = 'overdue_by_odometer', 'unexpected alert type: ' || e.alert_type;

  -- Overdue on date beats due-soon on distance.
  e := public.evaluate_due_status('2026-01-01', 1000, '2025-12-01', 1300, 14, 500, false);
  assert e.status = 'overdue', 'the worse of the two wins, got ' || e.status;
  assert e.alert_type = 'overdue_by_date', 'unexpected alert type: ' || e.alert_type;

  -- Overdue on both. The Rust original used max_by_key, which returns the last
  -- maximum, and the odometer candidate was pushed second. Nothing in the
  -- desktop app pinned this, so it is pinned here: a port that quietly picked
  -- the other one would change which alert people see.
  e := public.evaluate_due_status('2026-01-01', 2000, '2025-12-01', 1400, 14, 500, false);
  assert e.status = 'overdue', 'overdue on both counts is overdue';
  assert e.alert_type = 'overdue_by_odometer',
    'on a tie the odometer reading wins, got ' || e.alert_type;

  -- Due today by date beats due-soon by distance, because today is worse.
  e := public.evaluate_due_status('2026-01-01', 1000, '2026-01-01', 1300, 14, 500, false);
  assert e.status = 'due_today', 'due today outranks due soon, got ' || e.status;
  assert e.alert_type = 'due_soon_by_date', 'unexpected alert type: ' || e.alert_type;

  -- ----------------------------------------------------------------------
  -- A negative threshold must not make everything due
  -- ----------------------------------------------------------------------
  e := public.evaluate_due_status('2026-01-01', 1000, '2026-06-01', null, -5, -5, false);
  assert e.status = 'not_due', 'a negative threshold is treated as zero, got ' || e.status;
end $$;

-- ---------------------------------------------------------------------------
-- How an alert is worded and prioritised
-- ---------------------------------------------------------------------------
do $$
begin
  assert public.alert_priority('medium', 'overdue') = 'critical',
    'overdue work is critical whatever the schedule says';
  assert public.alert_priority('low', 'due_today') = 'high',
    'work due today is high priority whatever the schedule says';
  assert public.alert_priority('low', 'due_soon') = 'low',
    'anything less urgent keeps the schedule priority';

  assert public.alert_title_status('overdue') = 'overdue';
  assert public.alert_title_status('due_today') = 'due today';
  assert public.alert_title_status('due_soon') = 'due soon';
  assert public.alert_title_status('needs_setup') = 'needs attention';
end $$;

select 'due status behaves as it did on the desktop' as result;
