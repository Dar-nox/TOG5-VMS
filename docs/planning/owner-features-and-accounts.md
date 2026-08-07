# Owner features, accounts, and backups

Order is at the bottom.

The client approved the vehicle-centred page structure, so nothing here is
blocked and nothing gets reverted.

## Already shipped

- Display name editing, back in Settings
- Archive confirmations reworded to stop promising a restore that does not exist
- Pending-account badge on Settings

---

## 2. Accounts

The owner creates accounts in Settings. `signUp` uses the publishable key and
is allowed; the obstacle is that it replaces the current session, which a
throwaway client avoids:

```ts
const enrolment = createClient(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

await enrolment.auth.signUp({
  email,
  password,
  options: { data: { display_name: name } },
});
```

`persistSession: false` means it never writes to storage, so it cannot disturb
the owner's session. Discard it afterwards.

Fits the existing machinery: `handle_new_user()` makes account two onwards
**pending** regardless of who initiated it, so the account lands in the queue
Settings already shows and can be approved in the same action. The trigger
reads `display_name` from user metadata, so the owner sets the person's name
rather than it defaulting to the part before the `@`.

**Cost:** 1–2 hours. No Edge Function, no service key, no public sign-up link.

**Check first:** whether *Confirm email* is on in the project's auth settings.
If it is, this becomes an invitation flow rather than account creation.

**Rough edge:** the owner sets the starting password and must pass it on;
nothing forces a change at first sign-in. Worth a line on screen.

No separate accounts page — a Settings section is the right size for this
number of staff.

---

## 3. Archive and restore — done

An owner-only card in Settings lists archived trips, fuel logs, expenses and
reminders, each with Restore. Migrations 30 and 31, `archive_restore.sql`.

Vehicles are not in it. Archiving a vehicle sets `status = 'archived'` and
leaves the row visible; the vehicle editor already changes it back.

**Archiving was refused by the database and nobody knew.** An UPDATE with a
WHERE clause needs SELECT rights, so Postgres applies the SELECT policy to the
row the update is about to produce — and that policy filters `deleted_at is
null`. Every Archive button in the app failed with a permission error from the
first day of the online build. It hid because the client is still on the desktop
version and the test suite ran these updates as the superuser, which bypasses
RLS. Archiving now goes through definer functions that check for an active
account, which also fixes the cascades.

The zero archived rows on the live database were a symptom of that, not a
coincidence.

---

## 4. Backups

Point-in-time recovery is a paid Supabase tier, so any savepoint is one we
build. **The free plan takes no automatic copies at all**, which makes the
export the entire backup strategy rather than a nice extra.

**Keep the export as it is.** It already downloads, already works on a phone
through the share sheet, and the backup reminder already nags. It relies on
somebody pressing the button, which is acceptable.

**Add retention.** Keep the last few exports in a private Storage bucket as
well as offering the download, with a `snapshots` table recording who took each
one and when. Storage is the right home — 1 GB free there against 500 MB for
the records themselves. A few MB per snapshot, so keep ~10 and prune.

Retention is the point. If a bug corrupts data quietly, every recent copy
contains the corruption regardless of where it is stored; the only defence is
having one from before it started.

**Do not build restore-in-place yet.** It is the only feature capable of
destroying everything, it needs one transaction and careful trigger ordering,
and it defends against an event that may never happen. Revisit if there is a
concrete reason.

**A downloaded copy is not a full backup.** It holds every row of all nineteen
tables, but not the photos and receipts — only the rows saying where each file
lives — and not `auth.users`, which is unreachable through PostgREST. Rebuilt
elsewhere, pictures break and accounts need recreating (`profiles.id` points at
`auth.users.id`; `migrate_from_backup.py` has the `uuid5` remapping precedent).
Say this on screen rather than implying the file is everything. Schema, RLS,
triggers and functions are in `supabase/migrations/` in git, which is correct.

The client should be keeping a downloaded copy somewhere that is not the office
computer. That habit is worth more than any feature here.

---

## 5. Project pausing — done

**Supabase pauses free projects after 7 days of inactivity.** Unlikely for
daily use, but a holiday shutdown or a quiet stretch could do it. Restoring is
a click in the dashboard, and the project is unreachable until someone does it.

`unreachableMessage()` in `client.ts` now splits the two cases on
`navigator.onLine`, and the sign-in form no longer reports a request that never
arrived as a wrong password.

Still untested against a genuinely paused project — the only honest test is
pausing it in the dashboard and opening the app.

---

## 6. Other owner-only features

**Activity log.** "Who changed this odometer, and when" is the question an owner
asks when a number looks wrong — but `audit_logs` has **zero rows** and nothing
writes to it. Only the schema, its RLS policies and the export reading it exist.
This is not a screen over existing data; it needs writers first, across every
mutation path, and a decision about how long entries are kept. The largest item
on this page, not one of the smallest.

**Transfer ownership — done.** Migration 32, "Make owner" beside each active
account in Settings. One transaction, promotion before demotion so the "there
has to be one owner" rule is never momentarily false. Refuses a pending
account, since one that cannot see a row cannot approve anybody.

Not worth building: per-screen permissions (three roles is already at the
ceiling of useful for one company), and owner-only reports (costs are not
secret from the people incurring them).

---

## Order

Done: §5 error copy, §3 archive and restore, §6 transfer ownership.

What is left:

1. §2 owner creates accounts
2. §4 retention. Stop before restore-in-place.
3. §6 activity log — its own piece of work, not the tail of this one
