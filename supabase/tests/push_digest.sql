-- Who gets a notification, and when.
--
-- The job runs every hour and picks whose turn it is, so most of what matters
-- here is who it declines to send to. A digest that arrives at the wrong hour,
-- twice in a day, or saying nothing is due is how somebody learns to turn
-- notifications off.

create or replace function pg_temp.person(
  display_name text,
  send_at time,
  scope text default 'all',
  weekdays_only boolean default false,
  open_trip_hours integer default null,
  subscribed boolean default true
)
returns uuid
language plpgsql
as $$
declare
  person_id uuid;
begin
  insert into auth.users (email) values (display_name || '@tog5.test')
  returning id into person_id;

  insert into public.profiles (id, display_name, role, status)
  values (person_id, display_name, 'manager', 'active')
  on conflict (id) do update set status = 'active';

  insert into public.notification_preferences
    (profile_id, send_at, scope, weekdays_only, open_trip_hours)
  values (person_id, send_at, scope, weekdays_only, open_trip_hours);

  if subscribed then
    insert into public.push_subscriptions (profile_id, endpoint, p256dh, auth)
    values (person_id, 'https://push.test/' || person_id, 'key', 'auth');
  end if;

  return person_id;
end;
$$;

-- A Wednesday at 07:00 and at 09:00 in Manila, as the UTC the job would see.
create or replace function pg_temp.manila(stamp text)
returns timestamptz
language sql
as $$ select (stamp::timestamp at time zone 'Asia/Manila'); $$;

do $$
declare
  vehicle_id uuid;
  schedule_id uuid;
  early uuid;
  late uuid;
  unsubscribed uuid;
  weekday_only uuid;
  overdue_only uuid;
  found integer;
  message record;
begin
  -- Something for everybody to be told about.
  insert into public.vehicles (vehicle_name, vehicle_type, fuel_type, current_odometer)
  values ('Hilux Pickup', 'van', 'diesel', 1000)
  returning id into vehicle_id;

  insert into public.maintenance_schedules
    (vehicle_id, template_id, next_due_date, due_soon_days, due_soon_km, priority, status)
  values (vehicle_id,
          (select id from public.maintenance_templates where template_key = 'engine_oil_change'),
          current_date + 3, 14, 500, 'medium', 'due_soon')
  returning id into schedule_id;

  insert into public.alerts (vehicle_id, maintenance_schedule_id, alert_type, priority,
                             title, message, status)
  values (vehicle_id, schedule_id, 'due_soon_by_date', 'medium',
          'Oil change due soon', 'Due in 3 days.', 'active');

  early := pg_temp.person('Early', '07:00');
  late := pg_temp.person('Late', '09:00');
  unsubscribed := pg_temp.person('Unsubscribed', '07:00', subscribed => false);
  weekday_only := pg_temp.person('Weekday', '07:00', weekdays_only => true);
  overdue_only := pg_temp.person('OverdueOnly', '07:00', scope => 'overdue');

  -- ----------------------------------------------------------------------
  -- Whose turn it is
  -- ----------------------------------------------------------------------
  select count(*) into found
  from public.daily_digest(pg_temp.manila('2026-08-05 07:30'))
  where profile_id = early;
  assert found = 1, 'the 07:00 person should be told at 07:30 Manila';

  select count(*) into found
  from public.daily_digest(pg_temp.manila('2026-08-05 07:30'))
  where profile_id = late;
  assert found = 0, 'the 09:00 person must wait for their own hour';

  select count(*) into found
  from public.daily_digest(pg_temp.manila('2026-08-05 09:05'))
  where profile_id = late;
  assert found = 1, 'the 09:00 person should be told at 09:05 Manila';

  -- The same UTC instant is a different hour locally. A job thinking in UTC
  -- would deliver "07:00" in the middle of the afternoon.
  select count(*) into found
  from public.daily_digest('2026-08-05 07:30+00'::timestamptz)
  where profile_id = early;
  assert found = 0, 'preferences are wall-clock, not UTC';

  -- ----------------------------------------------------------------------
  -- Who is skipped
  -- ----------------------------------------------------------------------
  select count(*) into found
  from public.daily_digest(pg_temp.manila('2026-08-05 07:30'))
  where profile_id = unsubscribed;
  assert found = 0, 'nobody is sent to a person with no device';

  -- 2026-08-09 is a Sunday.
  select count(*) into found
  from public.daily_digest(pg_temp.manila('2026-08-09 07:30'))
  where profile_id = weekday_only;
  assert found = 0, 'weekdays-only means no Sunday buzz';

  select count(*) into found
  from public.daily_digest(pg_temp.manila('2026-08-05 07:30'))
  where profile_id = weekday_only;
  assert found = 1, 'weekdays-only still hears on a Wednesday';

  -- The only alert is due-soon, not overdue.
  select count(*) into found
  from public.daily_digest(pg_temp.manila('2026-08-05 07:30'))
  where profile_id = overdue_only;
  assert found = 0, 'somebody who asked only for overdue hears nothing about due-soon';

  -- ----------------------------------------------------------------------
  -- Sent once a day, however often the job runs
  -- ----------------------------------------------------------------------
  update public.notification_preferences
  set last_sent_on = (pg_temp.manila('2026-08-05 07:30') at time zone 'Asia/Manila')::date
  where profile_id = early;

  select count(*) into found
  from public.daily_digest(pg_temp.manila('2026-08-05 07:45'))
  where profile_id = early;
  assert found = 0, 'an hourly job must not send the same digest twice';

  -- ----------------------------------------------------------------------
  -- What it says
  -- ----------------------------------------------------------------------
  select * into message
  from public.daily_digest(pg_temp.manila('2026-08-05 09:05'))
  where profile_id = late;

  assert message.title = '1 item needs attention',
    'unexpected title: ' || message.title;
  assert message.body = 'Hilux Pickup', 'the vehicle should be named, got: ' || message.body;
  assert jsonb_array_length(message.subscriptions) = 1, 'the device should be carried with it';
end $$;

-- ---------------------------------------------------------------------------
-- A trip nobody closed
-- ---------------------------------------------------------------------------
do $$
declare
  vehicle_id uuid;
  watcher uuid;
  message record;
begin
  insert into public.vehicles (vehicle_name, vehicle_type, fuel_type, current_odometer)
  values ('Isuzu Truck', 'truck', 'diesel', 5000)
  returning id into vehicle_id;

  -- Thirty hours before the instant the job is being asked about, not before
  -- real now: the whole point of passing a timestamp in is that the test does
  -- not depend on when it runs.
  insert into public.trips (vehicle_id, departure_time, reason, status)
  values (vehicle_id, pg_temp.manila('2026-08-05 07:30') - interval '30 hours',
          'Delivery run', 'open');

  watcher := pg_temp.person('Watcher', '07:00', open_trip_hours => 24);

  select * into message
  from public.daily_digest(pg_temp.manila('2026-08-05 07:30'))
  where profile_id = watcher;

  assert message.profile_id is not null,
    'a trip open longer than the chosen window is worth a message on its own';
  assert message.body like '%1 trip still out%',
    'the open trip should be mentioned, got: ' || message.body;
end $$;

select 'the digest reaches the right people at the right hour' as result;
