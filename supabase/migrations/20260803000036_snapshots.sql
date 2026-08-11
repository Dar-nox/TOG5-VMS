-- Restore points the client does not have to remember to take.
--
-- The free plan takes no automatic copies of this database at all. Until now
-- the entire backup strategy was the Export button in Settings, which means the
-- fleet's only copy exists if somebody remembered to press it — and the copies
-- it makes live on whichever laptop pressed it.
--
-- So: a snapshot of every row, taken nightly, kept server-side, owner-only, and
-- pruned to the last ten. Retention is the point rather than a detail. If a bug
-- corrupts something quietly, every recent copy contains the corruption
-- whatever it is stored on; the only defence is still having one from before it
-- started.
--
-- Rows only, not files. The photos and receipts already live in Storage and are
-- as durable there as a copy of them would be — folding 34 MB of them into
-- every snapshot would spend the 1 GB free allowance ten times over to protect
-- against nothing the rows are not already exposed to.
--
-- NO RESTORE-IN-PLACE, deliberately, and not as a stepping stone to one. It is
-- the single feature here capable of destroying everything, it needs one
-- transaction with careful trigger ordering, and it guards against an event
-- that may never happen. Putting the fleet back from a snapshot is a supervised
-- job done with the JSON, not a button somebody presses at 2am on a phone.

-- ---------------------------------------------------------------------------
-- Where they live
-- ---------------------------------------------------------------------------
--
-- Private, like every other bucket. Unlike the others, only an owner may read
-- it: a snapshot is the whole database in one file, so it is a far larger thing
-- to hand out than one fuel receipt.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('backups', 'backups', false, 104857600, array['application/json'])
on conflict (id) do nothing;

drop policy if exists "owners read backups" on storage.objects;
drop policy if exists "owners remove backups" on storage.objects;

create policy "owners read backups"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'backups' and public.is_owner());

create policy "owners remove backups"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'backups' and public.is_owner());

-- No insert policy for anybody signed in. Snapshots are written by the Edge
-- Function with the service role, which bypasses these entirely — and a client
-- that could write here could put anything in a file the owner would later
-- trust as a backup.

-- ---------------------------------------------------------------------------
-- What was taken, and when
-- ---------------------------------------------------------------------------

create table if not exists public.snapshots (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null unique,
  size_bytes bigint not null,
  record_counts jsonb not null default '{}'::jsonb,
  -- Null when the nightly job took it, which is the normal case. Set when
  -- somebody pressed the button.
  taken_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.snapshots enable row level security;

drop policy if exists "owners see snapshots" on public.snapshots;

create policy "owners see snapshots"
  on public.snapshots for select
  to authenticated
  using (public.is_owner());

-- Again no insert or update policy: only the Edge Function writes here, and it
-- does so as the service role.

create index if not exists snapshots_created_at_idx
  on public.snapshots (created_at desc);

comment on table public.snapshots is
  'One row per automatic backup. Owner-only. Written by the backup-snapshot Edge Function, never by the app.';

-- ---------------------------------------------------------------------------
-- Asking for one
-- ---------------------------------------------------------------------------
--
-- Same shape as send_daily_digest: Postgres decides whether the caller is
-- allowed and hands the work to the function that can do it. pg_net posts and
-- does not wait — an HTTP call blocking a cron transaction is a cron job that
-- eventually wedges.

create or replace function public.take_snapshot()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  endpoint text;
  secret text;
  request_id bigint;
  caller uuid := auth.uid();
begin
  -- Null when pg_cron calls it, which is allowed. A person has to be the owner.
  if caller is not null and not public.is_owner() then
    raise exception 'Only the owner can take a backup.';
  end if;

  select decrypted_secret into endpoint
  from vault.decrypted_secrets where name = 'snapshot_url';

  select decrypted_secret into secret
  from vault.decrypted_secrets where name = 'push_digest_secret';

  if endpoint is null or secret is null then
    raise exception 'snapshot_url and push_digest_secret must exist in the vault';
  end if;

  select net.http_post(
           url := endpoint,
           headers := jsonb_build_object(
             'Content-Type', 'application/json',
             'Authorization', 'Bearer ' || secret
           ),
           body := jsonb_build_object('takenBy', caller),
           timeout_milliseconds := 60000
         )
  into request_id;

  return jsonb_build_object('handed_over', request_id);
end;
$$;

revoke execute on function public.take_snapshot() from anon;

comment on function public.take_snapshot is
  'Hands a backup to the Edge Function that can write one. Owner-only when a person calls it; pg_cron calls it with no caller.';

-- ---------------------------------------------------------------------------
-- To switch the nightly run on, once the function is deployed
-- ---------------------------------------------------------------------------
--
--   select vault.create_secret(
--     'https://<project-ref>.supabase.co/functions/v1/backup-snapshot',
--     'snapshot_url');
--
--   -- 18:00 UTC is 02:00 in Manila: after the working day, and a quiet hour to
--   -- be reading every row of the database.
--   select cron.schedule('tog5-snapshot', '0 18 * * *',
--                        $job$select public.take_snapshot()$job$);
--
-- And to stop it:
--
--   select cron.unschedule('tog5-snapshot');
