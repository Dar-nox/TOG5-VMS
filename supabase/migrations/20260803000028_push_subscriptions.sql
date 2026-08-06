-- Where the daily digest can reach somebody.
--
-- Maintenance alerts only exist when a screen asks for them: nothing runs on a
-- schedule, so an owner who does not open the app for a week is told nothing
-- for a week. A push reaches them in between — the push service wakes the
-- service worker with the app closed and the browser not running.
--
-- A subscription belongs to a browser on a device, not to a person. One account
-- signed in on a phone and on the office computer is two rows, and turning
-- notifications off on one must leave the other alone. The endpoint is
-- therefore the key, not the profile.

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  -- The URL the push service gave this browser. Unique because re-subscribing
  -- after a reinstall can hand back the same one, and two rows pointing at one
  -- device means two notifications every morning.
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  last_delivered_at timestamptz,
  -- A device that has been reset keeps failing for ever unless somebody counts.
  failure_count integer not null default 0,
  deleted_at timestamptz
);

create index if not exists push_subscriptions_profile_idx
  on public.push_subscriptions(profile_id) where deleted_at is null;

alter table public.push_subscriptions enable row level security;

-- Your own devices, and nobody else's. Deliberately narrower than the rest of
-- the schema, where colleagues can see each other's records: an endpoint is a
-- credential for talking to somebody's phone.
drop policy if exists "people read their own devices" on public.push_subscriptions;
drop policy if exists "people add their own devices" on public.push_subscriptions;
drop policy if exists "people change their own devices" on public.push_subscriptions;

create policy "people read their own devices"
  on public.push_subscriptions for select
  to authenticated
  using (profile_id = auth.uid());

create policy "people add their own devices"
  on public.push_subscriptions for insert
  to authenticated
  with check (profile_id = auth.uid() and public.is_active_user());

create policy "people change their own devices"
  on public.push_subscriptions for update
  to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

-- ---------------------------------------------------------------------------
-- What each person wants to hear, and when
-- ---------------------------------------------------------------------------
--
-- Per person rather than per fleet: an owner wants the early warning and a
-- driver usually only wants to know what is late. Also per person rather than
-- per device — somebody with a phone and an office computer does not want to
-- set the same preferences twice.

create table if not exists public.notification_preferences (
  profile_id uuid primary key default auth.uid()
    references public.profiles(id) on delete cascade,
  -- Local wall-clock time. The job runs every hour and picks whose turn it is,
  -- which is what lets one person get 6am and another 9am.
  send_at time not null default '07:00',
  scope text not null default 'all' check (scope in ('all', 'overdue')),
  -- Stops a Sunday buzz about work nobody can do until Monday.
  weekdays_only boolean not null default false,
  -- Hours a trip may stay open before it is worth mentioning. Null is off.
  open_trip_hours integer check (open_trip_hours is null or open_trip_hours > 0),
  -- What stops an hourly job sending the same digest twice.
  last_sent_on date,
  updated_at timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;

drop policy if exists "people read their own preferences" on public.notification_preferences;
drop policy if exists "people add their own preferences" on public.notification_preferences;
drop policy if exists "people change their own preferences" on public.notification_preferences;

create policy "people read their own preferences"
  on public.notification_preferences for select
  to authenticated
  using (profile_id = auth.uid());

create policy "people add their own preferences"
  on public.notification_preferences for insert
  to authenticated
  with check (profile_id = auth.uid() and public.is_active_user());

create policy "people change their own preferences"
  on public.notification_preferences for update
  to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

-- ---------------------------------------------------------------------------
-- What the morning message says
-- ---------------------------------------------------------------------------

-- One row per person with something to hear about and somewhere to hear it.
--
-- Nothing due means no row, which means no notification: a daily "all is well"
-- is how people learn to swipe the app away without reading it.
--
-- Deliberately a summary rather than one message per item. The fleet has
-- hundreds of reminders and they come due in clusters, so per-item delivery is
-- a notification storm on the day a batch lands.
-- The fleet's clock. Preferences are wall-clock times, and a job that thinks in
-- UTC would deliver "07:00" at three in the afternoon.
create or replace function public.fleet_timezone()
returns text
language sql
stable
as $$
  select coalesce((select value from public.settings where key = 'timezone'), 'Asia/Manila');
$$;

-- One row per person whose turn it is right now and who has something to hear
-- about.
--
-- Nothing due means no row, which means no notification: a daily "all is well"
-- teaches people to swipe the app away without reading it. Deliberately a
-- summary rather than one message per item — the fleet has hundreds of
-- reminders and they come due in clusters, so per-item delivery is a storm on
-- the day a batch lands.
create or replace function public.daily_digest(now_utc timestamptz default now())
returns table (
  profile_id uuid,
  title text,
  body text,
  subscriptions jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  with local_now as (
    select (now_utc at time zone public.fleet_timezone()) as stamp
  ),
  due_now as (
    select n.*, l.stamp
    from public.notification_preferences n
    cross join local_now l
    join public.profiles p on p.id = n.profile_id
    where p.deleted_at is null
      and p.status = 'active'
      -- Their hour, in the fleet's timezone.
      and extract(hour from n.send_at) = extract(hour from l.stamp)
      -- Sent already today, so an hourly job does not repeat it.
      and (n.last_sent_on is null or n.last_sent_on < l.stamp::date)
      and (not n.weekdays_only or extract(isodow from l.stamp) <= 5)
      and exists (select 1 from public.push_subscriptions s
                  where s.profile_id = n.profile_id and s.deleted_at is null)
  ),
  counted as (
    select d.profile_id,
           d.scope,
           d.open_trip_hours,
           d.stamp,
           count(a.id) filter (where a.status = 'active'
                                 and (d.scope = 'all' or a.priority = 'critical')) as alert_count,
           count(a.id) filter (where a.status = 'active' and a.priority = 'critical') as overdue_count,
           (array_agg(distinct a.vehicle_name) filter (where a.status = 'active'))[1:2] as vehicles,
           count(distinct a.vehicle_name) filter (where a.status = 'active') as vehicle_count,
           (select count(*) from public.trips t
            where t.status = 'open' and t.deleted_at is null
              and d.open_trip_hours is not null
              and t.departure_time < now_utc - make_interval(hours => d.open_trip_hours)
           ) as stale_trips
    from due_now d
    left join public.alerts_detailed a on true
    group by d.profile_id, d.scope, d.open_trip_hours, d.stamp
  )
  select
    c.profile_id,
    case
      when c.overdue_count > 0 and c.scope = 'overdue'
        then format('%s overdue', c.overdue_count)
      when c.overdue_count > 0
        then format('%s overdue, %s due soon', c.overdue_count, c.alert_count - c.overdue_count)
      else format('%s %s attention',
                  c.alert_count,
                  case when c.alert_count = 1 then 'item needs' else 'items need' end)
    end,
    trim(both ' ·' from concat_ws(' · ',
      -- Named, and only the first two: "Hilux Pickup, Isuzu Truck and 3 more"
      -- is readable on a lock screen; a list of eleven is not.
      case
        when c.vehicle_count > 2
          then format('%s and %s more', array_to_string(c.vehicles, ', '), c.vehicle_count - 2)
        else array_to_string(c.vehicles, ', ')
      end,
      case
        when c.stale_trips > 0
          then format('%s %s still out',
                      c.stale_trips,
                      case when c.stale_trips = 1 then 'trip' else 'trips' end)
      end
    )),
    (select jsonb_agg(jsonb_build_object(
              'endpoint', s.endpoint, 'p256dh', s.p256dh, 'auth', s.auth))
     from public.push_subscriptions s
     where s.profile_id = c.profile_id and s.deleted_at is null)
  from counted c
  where c.alert_count > 0 or c.stale_trips > 0;
$$;

comment on function public.daily_digest is
  'One summary per person whose chosen hour it is, who has a device subscribed, and who has something to hear about. Empty otherwise.';

revoke execute on function public.daily_digest(timestamptz) from anon, authenticated;
