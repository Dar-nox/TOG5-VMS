# 01 — Tech Stack and Architecture

## The Stack

- Frontend: React + TypeScript, built with Vite
- Database: Postgres, hosted by Supabase
- Data access: `supabase-js` straight from the browser, over PostgREST
- Business rules: Postgres functions
- Access control: row level security
- Accounts: Supabase Auth (email and password)
- Files: Supabase Storage, private buckets, signed links
- Phone: the web app installed from the browser, plus an Android APK built with
  Capacitor
- Windows: a Tauri window wrapping the same build
- Version control: Git

## Architecture

There is no application server. The browser talks to Postgres, and Postgres
decides what it is allowed to do.

```text
Clients
  Browser, installed web app, Android APK, Windows window
  — all the same build

Supabase
  PostgREST      tables and views over HTTP
  Auth           who somebody is
  Storage        photos and receipts, private
  Postgres
    Row level security   what they may see and change
    Functions            the business rules
    Triggers             consequences that must not be forgotten
```

### Why the rules live in the database

The desktop app put them in Rust, in front of the database, which worked
because there was exactly one way in. Now there are four clients and anybody
can reach PostgREST directly with the publishable key. A rule enforced in the
client is a rule that is not enforced.

So the things that must always hold are in Postgres:

* **Row level security** on every table, including `deleted_at is null`, so a
  soft-deleted row does not exist as far as any client is concerned.
* **Functions** for anything that has to happen as one piece — completing a
  service touches four tables, and half of it applied would leave a vehicle
  with a service record and a reminder still saying overdue.
* **Triggers** for consequences that are easy to forget: a fuel log moves the
  vehicle's odometer, and moving the odometer re-evaluates what is due.

This is also why `evaluate_due_status` is a database function. Four different
places asked that question in the desktop app, and four places is four chances
to answer it differently.

### Clients are thin on purpose

Everything in `src/services/api/` is a call to a view or a function. There is
no business logic in the browser worth the name — the client formats, validates
for the person's benefit, and shows what comes back.

`src/services/api/client.ts` is worth knowing about: `supabase-js` resolves with
`{ data, error }` and never throws, while every screen in this app was written
against a contract that throws. That wrapper restores it. Without it, failures
stop being caught and screens render `undefined` instead of saying what went
wrong.

## Folder Structure

```text
tog5-vms/
  src/
    app/
      routes/
      providers/        auth context, session
    components/
      auth/             sign in, waiting for approval, cannot reach
      common/
      dashboard/  vehicles/  fuel/  maintenance/  reports/  settings/
    domain/             shared types and enums
    services/
      api/              one module per area, all through client.ts
      files/            signed URL resolution
      validation/  formatting/
    types/
  supabase/
    migrations/         the real schema, applied in filename order
    tests/              run.sh, mutate.sh, one file per area
    push.sh             apply migrations to the project
    migrate_from_backup.py   desktop backup to SQL
  src-tauri/            a window, and nothing else
  specs/
  docs/
```

## Data Storage

Postgres holds the records. Supabase Storage holds photos and receipts, in four
private buckets: `vehicle-photos`, `fuel-receipts`, `maintenance-receipts`,
`maintenance-photos`.

The buckets are private, so files are reached through short-lived signed links
rather than by URL. A receipt is not readable by anyone who guesses a filename.

Rows store the object path, never the bytes. Images are shrunk in the browser
before upload — 1600px, JPEG quality 0.82 — which is what keeps a fleet of
10–30 vehicles inside the free 1 GB.

## Accounts and Access

Anybody with the app can create an account, because the key that allows it
ships inside the app. So a new account starts `pending` and can see nothing at
all until an owner admits it from Settings.

Roles are `owner`, `manager`, `viewer`. Only `owner` is enforced today — it
gates account management, settings, and exports. `manager` and `viewer` are
identical and exist so a future limit needs no migration.

## Testing

`supabase/tests/run.sh` applies every migration to a throwaway Postgres and
runs the suite. Needs Docker and nothing else.

`supabase/tests/mutate.sh` weakens one access rule at a time and confirms the
suite notices. Run it after touching any policy — the first version of "a
manager cannot create an account" passed just as happily with the rule deleted.

Business rules ported from the Rust were checked by running the same inputs
through both and diffing the output, message strings included.

## Error Handling

Errors should be friendly and actionable.

Bad: `Constraint violation: fuel_logs_vehicle_id_foreign_key`

Good: `Fuel log could not be saved because the selected vehicle no longer
exists.`

Database functions raise their own messages with `raise exception`, and those
come through to the screen unchanged — they are written for the person reading
them. Everything else is translated by error code, because a raw constraint
name helps nobody.

Two failures are told apart deliberately, because confusing them sends people
in circles: **not signed in** (sign-in screen) and **cannot reach the
database** (its own screen, with a retry). Telling somebody to sign in when the
connection is down has them retyping a password that was never the problem.

## Online Only

There is no offline mode, no queue, no sync. This was confirmed with the
client.

The service worker caches the app shell so it opens fast, and caches **no fleet
data at all**. A cached odometer reading with no way to tell it is stale is
worse than a spinner, and much worse than an honest error.

Writes must fail visibly. Nothing is accepted optimistically and then lost.

## Backups

The free plan takes no automatic copies. The Backup screen exports every record
as one file, and each export is recorded so the app can say how long it has
been since the last one. That reminder is the only thing standing between the
client and a total loss, so it is not decoration.
