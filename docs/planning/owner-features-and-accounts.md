# Owner features, accounts, and backups — next session

Nothing here is built. Order is at the bottom.

Blocked on one thing: the client's verdict on the vehicle-centred page
structure. If they reject it, add fleet-wide capture screens with a vehicle
picker first. That is additive — the design system, primitives, layout fixes
and bug fixes are independent of where screens live, so nothing gets reverted.

---

## 1. Fix first

**Display name is no longer editable.** Dropped when Settings was consolidated;
the old screen had it. `updateUser` already accepts `displayName`, so this is a
field and a save button next to the password card. ~20 minutes.

**Archive confirmations promise a restore that does not exist.** Every archive
dialog says "Archived records can be restored". True of the data — everything
soft-deletes — but nothing in the app brings a record back. Either build §3 or
change the wording to "This cannot be undone from the app" until it ships.

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

## 3. Archive and restore

Everything soft-deletes and nothing can be brought back. An owner-only screen
listing archived vehicles, fuel logs, expenses, trips and reminders, with a
Restore action.

This is the most likely data loss in the app — someone archiving the wrong
record — and it is the cheapest thing here. It also makes the confirmation copy
in §1 true.

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

## 5. Project pausing

**Supabase pauses free projects after 7 days of inactivity.** Unlikely for
daily use, but a holiday shutdown or a quiet stretch could do it. Restoring is
a click in the dashboard, and the project is unreachable until someone does it.

The app currently handles this badly. A paused project and a dead wi-fi
connection produce the same screen, which says *"Check your internet
connection, then try again."* — wrong advice, and it sends someone to their
router while the fix is in the Supabase dashboard.

Worth splitting: if `navigator.onLine` is true but the request failed, say the
service is not responding rather than blaming the connection. Same for
`OFFLINE_MESSAGE` in `client.ts`. Cheap, and it saves an hour of confusion on
the one day it matters.

---

## 6. Other owner-only features

**Activity log.** `audit_logs` is populated and displayed nowhere. "Who changed
this odometer, and when" is the question an owner asks when a number looks
wrong. Read-only over existing data.

**Transfer ownership.** The first account is owner forever; if that person
leaves there is no path that avoids SQL.

**Pending-account badge** on Settings so approvals get noticed.

Not worth building: per-screen permissions (three roles is already at the
ceiling of useful for one company), and owner-only reports (costs are not
secret from the people incurring them).

---

## Order

1. Client verdict on page structure
2. §1 display name — 20 minutes
3. §3 archive and restore — also settles the §1 copy problem
4. §2 owner creates accounts
5. §5 error copy for a paused or unreachable project
6. §6 activity log
7. §4 retention. Stop before restore-in-place.

Transfer ownership whenever it comes up; small and independent.
