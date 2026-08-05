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

### The constraint that decides the shape

**An owner cannot create accounts from the browser.** Supabase's
`auth.admin.createUser` requires the *service role* key, which bypasses row
level security entirely and must never ship in a client bundle — AGENTS.md is
explicit that the publishable key is the only key allowed in the app.

So "owner creates accounts in Settings" is not a UI problem. It needs code
running somewhere the service key can live.

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

**A now, B later if the client dislikes open sign-up.** A is an hour and makes
the app honest about a flow that is already fully built and currently has no
front door. B is the better end state for a company, but it is the first piece
of server-side code in this project and should not be bundled into the same
week as a page-structure decision.

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
2. **§0a and §0b** — the name field, and making the archive copy true. Small,
   and one of them is a promise the app is currently breaking.
3. **§1 Option A** — sign-up link. An hour, and it opens a door that is
   otherwise walled off.
4. **§3 Archive/restore, then Activity log.** Both read or write data that
   already exists.
5. **§2 snapshots, half one.** Then stop and think before the restore half.

Ownership transfer whenever it comes up; it is small and independent.
