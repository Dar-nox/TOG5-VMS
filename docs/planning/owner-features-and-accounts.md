# Owner features, accounts, and savepoints — for the next session

Written 2026-08-05, at the end of the UI overhaul session. Nothing here is
built. Sequencing is at the bottom.

---

## 0. Two things to fix regardless of what the client says

These are not new features. One is a regression I introduced, the other is
copy that promises something the app cannot do.

### 0a. You can no longer change your own display name — I removed it

The old Settings screen had it (`SettingsModule.tsx` on `main`, lines 53, 80,
150–169: `updateUser({ id: user.id, displayName })`). When I consolidated
Settings I kept role and status changes for *other* people and dropped the
"your own profile" section entirely. That was not a decision, it was an
oversight.

`updateUser` already accepts `displayName`, so this is a field and a save
button — perhaps twenty minutes. It belongs next to the password card.

### 0b. Every confirmation dialog says "Archived records can be restored", and nothing restores them

I wrote that line into the archive confirmations for fuel logs, expenses,
trips, maintenance reminders and vehicles. It is true about the *data* —
everything is a soft delete, the row keeps its `deleted_at` — but there is no
way for anybody using the app to bring one back. Grep confirms no restore path
exists anywhere in `src/services/api/`.

So the app currently reassures people with something it cannot deliver. Two
honest fixes:

1. **Build the restore** (see §3, "Archive"). Best answer, and it makes the
   copy true.
2. **Change the copy** to "This cannot be undone from the app" until then.

Do one of these before the client sees the confirmations. I would do (1),
because it is also the foundation for savepoints.

---

## 1. Account creation and management

### Correcting what I said first

I claimed an owner cannot create accounts from the browser. That is true of
`auth.admin.createUser`, which needs the *service role* key and must never ship
in a client bundle — and it is **not true in general**, which is the part I got
wrong.

Ordinary `signUp` uses the publishable key and is already allowed. The only
real obstacle is that `signUp` **replaces the current session**: the owner
would be signed out and become the account they just made. That is a solvable
problem, not a wall. See Option A2, which is now the recommendation.

### Option A — Self sign-up, owner approves *(recommended)*

Add a "Create account" link to the sign-in screen. Everything behind it is
already built and tested:

- `handle_new_user()` makes the first account owner/active and **every account
  after it manager/pending** (migration 021, line 37)
- `NotAdmittedScreen` already tells a pending user to ask the owner
- Settings already lists pending people at the top with **Let in** / **Refuse**

**Cost:** roughly an hour. No new infrastructure, no service key anywhere.

**Trade:** anybody with the URL can create an account. They see nothing until
approved, and the owner gets a visible queue — but the owner does have to
notice. Worth pairing with a pending-count badge on the Settings tab.

### Option A2 — Owner creates the account, in Settings *(recommended)*

Your idea, and it works. The owner fills in a name, email and starting
password; the app calls the ordinary `signUp` on a **second, throwaway Supabase
client**:

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

`persistSession: false` is the whole trick. Sessions are shared between client
instances through storage, so a client that never writes to storage cannot
disturb the owner's session in `services/api/client.ts`, which uses
`persistSession: true`. The throwaway client is discarded straight after.

Two things make this fit better than expected:

- `handle_new_user()` does not care who initiated the sign-up. It makes account
  two onwards **pending** regardless, so an owner-created account lands in the
  same queue and the owner approves it — exactly the "create button acts as the
  approval" you described. It can be approved automatically in the same flow,
  since the owner is the one creating it.
- The trigger reads `raw_user_meta_data ->> 'display_name'`, so passing
  `options.data.display_name` sets the person's name at creation instead of
  defaulting to the part of their email before the `@`.

**Cost:** an hour or two. No Edge Function, no service key, no new
infrastructure.

**Check before building:** whether *Confirm email* is switched on in the
Supabase project's auth settings. If it is, the new account cannot sign in
until they click a link, which changes this from "create an account" into "send
an invitation". It is very likely off, since accounts work today — but confirm
rather than assume.

**Known rough edge:** the owner chooses the starting password and has to pass
it on, and nothing forces a change at first sign-in. Acceptable for a small
company; worth a "change this soon" line on the screen.

### Option B — Owner invites, via a Supabase Edge Function

The owner types an email; an Edge Function holding the service key calls
`auth.admin.inviteUserByEmail`. The person gets a link and sets their own
password.

**Cost:** meaningfully more — a first Edge Function, a secret to manage, a
deploy step outside the current Cloudflare pipeline, and email delivery to
configure. Free tier includes Edge Functions, so no subscription change.

**Trade:** nobody unknown can ever create an account. Cleaner for a company
fleet, and closer to what you actually asked for.

### Option C — Keep it in the Supabase dashboard

What happens today. Free, already works, and the approval flow still runs. But
it means the owner leaves the app and uses a developer console, and the
"waiting to be let in" copy is misleading because they never signed up.

### My view

**A2, and probably not A at all.** For a company fleet, the owner creating
accounts is the behaviour you actually want, and A2 gets there for about the
same effort as A with none of the exposure — nobody who happens to have the URL
can create anything. It reuses the pending/approve machinery rather than
bypassing it, so nothing already built is wasted.

Add the public sign-up link (A) only if the client wants staff to enrol
themselves. B stays on the shelf: it is the tidiest end state, but it is the
first server-side code in this project, and A2 covers the need without it.

Either way, **a separate accounts page is not needed yet.** There are a handful
of staff. A section in Settings is the right size; split it out if it ever
grows past a screenful.

---

## 2. Backup savepoints / restore points

This is the most valuable idea in your list and also the most dangerous, so it
is worth being precise about what is and is not possible.

### What exists now

An export builds a JSON file of every table and hands it to the browser or the
share sheet. It is a copy the client holds. **The app cannot put one back** —
and on the free plan Supabase takes no automatic copies at all, so that file is
genuinely the only copy.

### What "savepoint" could mean

**Point-in-time recovery** is a Supabase feature, but it is Pro-and-above. Not
available here without changing plans.

So a savepoint has to be something the app builds:

**Snapshot into Storage** — the same JSON the export produces, written to a
private bucket instead of downloaded, with a row in a `snapshots` table
recording who took it and when. Storage is the right home: the free tier gives
1 GB there versus 500 MB for the whole database, and a snapshot in the database
would count against the space the fleet's actual records need.

**Restore** — an owner-only Postgres function that truncates and reloads inside
one transaction. This is the part that needs real care:

- It must be one transaction. A restore that fails halfway is worse than no
  restore.
- Foreign keys and the soft-delete triggers have to be handled in the right
  order — the migration script already had to disable user triggers and split
  the load across two transactions to get around `ALTER TABLE ... pending
  trigger events`. Expect the same fight.
- It should take a snapshot *before* restoring, automatically. The worst
  outcome is somebody restoring the wrong savepoint and losing the present.
- Confirmation should be typed, not clicked. This is the one action in the app
  destructive enough to justify making somebody type the fleet's name.

**Sizing:** the current database exports to a few MB. Keeping the last ~10
snapshots is comfortably inside 1 GB. Prune older ones automatically.

### Local copies as well as online — yes, and it is the stronger half

Every snapshot should be downloadable, and taking one should offer the file
immediately as well as storing it. The download path already exists and already
works on a phone through the share sheet, so this is nearly free.

Worth being precise about what a local copy does and does not buy, because it
is easy to overclaim:

- **It does not help you restore while Supabase is down.** Restoring writes to
  the database, so if the database is unreachable there is nothing to restore
  into, whichever copy you hold.
- **It does protect against losing the project entirely** — a deleted project,
  a lost login, a free-tier account paused for inactivity, a billing mistake.
  In that case an online-only snapshot disappears with everything else, and the
  local file is the only thing left. That is the real hedge, and it is a good
  one.

So the two copies answer different failures, and the local one answers the
worse failure. Treat the downloaded file as the record of last resort and say
so on screen — the client should be keeping one somewhere that is not a laptop.

### My view

**Worth building, in two halves, and do not ship the second half early.**

Half one — "take a snapshot" and "download an old snapshot" — is genuinely
useful on its own, low risk, and immediately better than the current
download-only export. Half two — restoring in place — deserves its own session
and its own tests, because it is the only feature in this app that can destroy
everything.

Also worth saying: this is close to §0b. The Archive screen and snapshots are
the same instinct — undo — at two different scales. Build the small one first.

---

## 3. What else should separate the owner

Ranked by how much they are actually worth.

### Worth building

**Archive / restore.** Everything soft-deletes and nothing can be brought back.
An owner-only screen listing archived vehicles, fuel logs, expenses and trips,
with a Restore button. Fixes §0b, and it is the single most useful owner power
because it undoes ordinary mistakes rather than catastrophes.

**Activity log.** There is already an `audit_logs` table, populated and
exported, and nothing displays it. "Who changed this vehicle's odometer, and
when" is exactly the question an owner asks when a number looks wrong. This is
a read-only list over data that already exists — cheap, and immediately useful.

**Transfer ownership.** Today the first account created is owner forever. If
that person leaves the company, there is no path that does not involve SQL.
Small function, meaningful safety.

### Probably worth it

**Pending-account badge** on Settings, so approvals are noticed without
checking.

**Fleet-wide defaults an owner can lock** — due-soon thresholds already exist
and are owner-only; the same could apply to which maintenance items are
standard across all vehicles.

### I would not bother

**Per-screen permissions.** Three roles for a handful of staff at one company
is already close to the ceiling of useful. More granularity is configuration
nobody will maintain.

**Owner-only reports.** Costs are not secret from the people who incur them,
and hiding them makes the app feel like surveillance rather than a logbook.

---

## 4. Sequencing

The page-structure question comes first, because it changes what "add a vehicle
picker" means and there is no point building on top of an answer that might
move.

1. **Client verdict on the vehicle-centred structure.**
   - *Kept* → carry on below.
   - *Rejected* → add fleet-wide capture screens with a vehicle picker first.
     Note this is additive: the design system, primitives, layout fixes,
     formatting and every bug fix are independent of where the screens live.
     Nothing from this overhaul needs reverting.
2. **§0a — the display name field.** Twenty minutes, and it is a regression.
3. **§3 Archive / restore.** Agreed for the next session if the structure is
   approved. This also settles §0b: once records can be brought back, the
   confirmation copy saying they can be restored becomes true. Until it ships,
   the copy is a promise the app is breaking, so if this slips, change the
   wording in the meantime.
4. **§1 Option A2** — owner creates accounts in Settings. An hour or two, and
   check the *Confirm email* project setting first.
5. **§3 Activity log.** Read-only over `audit_logs`, which is already
   populated and shown nowhere.
6. **§2 snapshots, half one** — take, store online, download. Then stop and
   think before the restore half.

Ownership transfer whenever it comes up; it is small and independent.
