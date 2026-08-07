# Before handover

Live at **https://tog5-vms.flamingsunsgt.workers.dev** — recorded here because
it was not written down anywhere in the repo. Cloudflare builds from `main`.

Checking a deploy landed: the routes are code-split, so the entry bundle is the
wrong place to look for a screen. `assets/SettingsPage-*.js` holds Settings;
`assets/index-*.js` holds the API client and shell.

Written 2026-08-07, after the owner-features session. Everything below is
outstanding; the ordering is by what blocks what, not by size.

The client is still on the desktop build and stays there until this one is
finished. They send a fresh backup on the day, and it overwrites whatever the
online database holds — so the current contents are scratch, and anything below
about test data can be ignored rather than cleaned.

---

## 1. Go-live day

**Import the fresh backup.** They send it on the day; the copy in the repo root
is outdated and must not be used. Rehearse before touching the real project:

```sh
supabase/rehearse_migration.sh <backup-dir>     # throwaway Postgres, counts rows in vs out
supabase/migrate_from_backup.py                 # then the real one
```

The rehearsal exists because "the load did not error" and "the fleet is intact"
are different claims.

**Migrations first.** `PGPASSWORD='...' supabase/push.sh` — everything is
re-appliable, so running the whole set is normal.

## 2. Credentials — decided: not rotating

Four values passed through development chat transcripts: the database password,
the Supabase access token, the VAPID private key, and `PUSH_SHARED_SECRET`.
The decision is to leave them and clear the transcripts instead.

**Nothing ever reached git.** Checked with `git log --all -S` on each of the
four: zero commits. `.supabase-token.local` is covered by `*.local` in
`.gitignore` and is untracked. So there is no history to rewrite, which is the
expensive kind of cleanup and it is not needed.

| | where it lives |
| --- | --- |
| Database password | Supabase dashboard; only `push.sh` uses it |
| Supabase access token | `.supabase-token.local`; account-wide, not project-scoped |
| VAPID private key | Edge Function secrets |
| `PUSH_SHARED_SECRET` | Vault **and** Edge Function — must match |

Two things that follow from not rotating, both worth knowing rather than acting
on:

- Clearing a transcript removes the local copy. It does not retract what was
  sent. Whether that matters is a judgement about that channel, and the
  judgement has been made.
- **The repository lives inside a OneDrive-synced folder**, so
  `.supabase-token.local` syncs to Microsoft in plaintext. That is a standing
  exposure independent of any chat, and clearing transcripts does not touch it.
  Moving that one file outside the synced tree would cost nothing if it ever
  seems worth it.

If any of these is ever rotated later, only VAPID has a knock-on: it invalidates
every existing subscription, so everybody has to turn notifications on again.

The owner account's password is also from development and is worth changing at
some point.

## 3. The digest — done

Scheduled 2026-08-07 as `cron.job` 1, `0 * * * *`, active.

Proven end to end the same day: a real push went the whole way — vault lookup,
pg_net, Edge Function, VAPID signing, aes128gcm encryption, push service,
service worker — and returned `{"sent":1,"dropped":0}`.

**Note for whoever tests it next:** `send_at` matches on the **hour**, not the
minute, and `last_sent_on` stops a second send the same day. To repeat a test:
`update public.notification_preferences set last_sent_on = null;`

A vehicle named `ZZ Notification Test (safe to delete)` is still in the fleet
with one due-soon reminder, deliberately: it is what gives the first scheduled
run something to report. **Delete it once that run has been seen.** Cleanup SQL
is at the bottom of this file.

## 4. Untested in the real world — deferred to the consultation

The client wants the app built first and tested when they are present, so what
remains below is checked with them rather than before them. That is the right
call for these three: each needs either their environment or their hardware,
and none can be simulated convincingly from here.

Green in the suite, never run against the live project or a real person.

- ~~**Archive and restore.**~~ Verified against the live database on
  2026-08-07: a fuel log created, archived through `archive_fuel_log`, found in
  `archived_records()` with the right litres and station, restored, and the
  vehicle's odometer unmoved throughout. The test row was removed afterwards.
- **The paused-project message.** The only honest test is pausing the project
  in the dashboard and opening the app. Everything else is a simulation of the
  thing being tested.
- **iPad and iPhone notifications.** The manual already declines to promise
  these. Nobody has a working phone to check with, and a desktop browser proved
  the encryption, which is the part that is shared.

## 5. Left on the feature list

From `owner-features-and-accounts.md`, both deliberately not done:

**Backup retention.** The free plan takes no automatic copies at all, so the
export is the entire backup strategy and depends on somebody pressing a button.
Retention means keeping the last ~10 exports in a private Storage bucket with a
`snapshots` table, and pruning. The point is having a copy from *before* a
problem started — if a bug corrupts data quietly, every recent copy contains
the corruption. Stop before restore-in-place.

**Activity log.** `audit_logs` has zero rows and nothing writes to it. It needs
writers across every mutation path before it needs a screen, plus a decision on
how long entries are kept. Its own piece of work.

## 6. Settled, recorded so it is not re-litigated

**The wide reminder windows are intentional.** 374 items carry a warn window
that makes them read as due soon well ahead of time. This was investigated at
length and is not a fault in the app — the client will edit individual reminders
where they disagree, which the UI now allows. Two genuinely impossible rows
(warn longer than the interval) were corrected by migration 25.

**Archiving was broken from day one** and is fixed. An UPDATE with a WHERE
clause needs SELECT rights, so Postgres applied the read policy — which filters
`deleted_at is null` — to the row the update was about to produce. Every Archive
button failed. It hid because the client never used the online build and the
test suite ran as the superuser, which bypasses RLS. Migrations 30 and 31.

**Export is open to every active account**, on purpose. It is the only copy of
the records the client holds, and making it wait for one person is how it stops
being taken.

## 7. Worth a look on go-live day

**The archive is not empty.** 75 reminders are already soft-deleted, archived in
small batches on 19–20 July 2026 — someone working through the desktop app
removing items one at a time. They are real, and the restore screen lists all of
them.

That is correct behaviour, not a bug: they can be brought back, and the list is
newest-first so anything archived today leads. But the client's fresh backup
will bring its own equivalent, and if that number is much larger the screen
becomes a wall. Worth looking at once the real data is in, and capping the list
or filtering by age only if it actually reads badly.

## Cleanup SQL

For the notification test vehicle, once the first scheduled digest has been
seen:

```sql
delete from public.alerts where vehicle_id in
  (select id from public.vehicles where vehicle_name like 'ZZ Notification Test%');
delete from public.maintenance_schedules where vehicle_id in
  (select id from public.vehicles where vehicle_name like 'ZZ Notification Test%');
delete from public.vehicle_maintenance_settings where vehicle_id in
  (select id from public.vehicles where vehicle_name like 'ZZ Notification Test%');
delete from public.vehicles where vehicle_name like 'ZZ Notification Test%';
```

## 8. After all of it

The UI overhaul, which is being held back on purpose until the migration is
finished. Known cosmetic bugs are being lived with rather than chased mid-flight.
