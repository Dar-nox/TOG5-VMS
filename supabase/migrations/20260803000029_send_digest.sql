-- Handing the digest to something that can send it.
--
-- Postgres decides who hears what; a Web Push message has to be VAPID-signed
-- and encrypted per recipient, which needs a crypto runtime. pg_net posts the
-- job to the Edge Function and does not wait for it — an HTTP call that blocks
-- a cron transaction is a cron job that eventually wedges.
--
-- NOT SCHEDULED BY THIS FILE. The cron entry is the last step and is
-- deliberately left to be run by hand, because the fleet's reminder thresholds
-- are still under discussion: switching this on beforehand means a notification
-- every morning about 374 items that are only "due soon" because of a value
-- nobody has confirmed yet. The command is at the bottom.

-- Marks a digest as delivered. Called by the function after the push services
-- have accepted it, not before — a run that fails should try again on the next
-- hour rather than being silently skipped until tomorrow.
create or replace function public.mark_digest_sent(profile_ids uuid[])
returns void
language sql
security definer
set search_path = public
as $$
  update public.notification_preferences n
  set last_sent_on = (now() at time zone public.fleet_timezone())::date,
      updated_at = now()
  where n.profile_id = any(profile_ids);
$$;

revoke execute on function public.mark_digest_sent(uuid[]) from anon, authenticated;

-- The scheduled entry point. Refreshes what is due, then hands over.
create or replace function public.send_daily_digest()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  endpoint text;
  secret text;
  waiting integer;
  request_id bigint;
begin
  -- Nothing to send to means nothing to compute. Worth checking first: this
  -- runs every hour, and for most of them the answer is nobody.
  select count(*) into waiting from public.daily_digest();

  if waiting = 0 then
    return jsonb_build_object('sent', 0, 'note', 'nobody due this hour');
  end if;

  -- The alerts have to be current before they are counted. This is the only
  -- thing in the app that refreshes them without somebody opening a screen.
  perform public.refresh_maintenance_alerts_for_all_vehicles();

  select decrypted_secret into endpoint
  from vault.decrypted_secrets where name = 'push_digest_url';

  select decrypted_secret into secret
  from vault.decrypted_secrets where name = 'push_digest_secret';

  if endpoint is null or secret is null then
    raise exception 'push_digest_url and push_digest_secret must exist in the vault';
  end if;

  select net.http_post(
           url := endpoint,
           headers := jsonb_build_object(
             'Content-Type', 'application/json',
             'Authorization', 'Bearer ' || secret
           ),
           body := '{}'::jsonb,
           timeout_milliseconds := 30000
         )
  into request_id;

  return jsonb_build_object('handed_over', request_id, 'waiting', waiting);
end;
$$;

revoke execute on function public.send_daily_digest() from anon, authenticated;

comment on function public.send_daily_digest is
  'Hourly entry point: refreshes alerts and hands the digest to the push function. Scheduled by hand, not by this migration.';

-- ---------------------------------------------------------------------------
-- To switch it on, once the thresholds are settled and the function is deployed
-- ---------------------------------------------------------------------------
--
--   create extension if not exists pg_cron;
--   create extension if not exists pg_net;
--
--   select vault.create_secret(
--     'https://<project-ref>.supabase.co/functions/v1/push-digest', 'push_digest_url');
--   select vault.create_secret('<a long random string>', 'push_digest_secret');
--
--   -- Hourly, because people choose their own delivery time and the function
--   -- picks whose turn it is.
--   select cron.schedule('tog5-digest', '0 * * * *',
--                        $job$select public.send_daily_digest()$job$);
--
-- And to stop it:
--
--   select cron.unschedule('tog5-digest');
