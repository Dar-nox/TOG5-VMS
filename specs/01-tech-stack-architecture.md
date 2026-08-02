# 01 — Tech Stack and Architecture

## Stack

- Server: Rust with Axum, one self-contained executable
- Frontend: React + TypeScript, built with Vite, served by that same executable
- Database: SQLite through rusqlite, in WAL mode, behind an r2d2 pool
- Sign-in: Argon2 password hashing with server-side sessions
- Public address: Cloudflare Tunnel, no port forwarding and no static IP
- Clients: a PWA on phones, a Tauri webview shell on Windows desktops
- File storage: app-managed folders beside the database
- Version control: Git

SQLite stays. A fleet writes a few dozen rows a day, and one file is far easier
to back up and restore than a database server. The path to Postgres remains
open if the shape of the work ever changes, but nothing today asks for it.

## Architecture Style

```text
Clients
  PWA on phones, webview shell on desktops, plain browser anywhere
  No business logic; they render and they call the API

HTTP Layer (crates/vms-server)
  Sign-in and sessions, the owner gate, the RPC surface, managed files

Domain and Persistence (crates/vms-core)
  Vehicle rules, fuel efficiency, maintenance scheduling, alerts, backups,
  SQLite repositories and migrations
  Knows nothing about HTTP or about who is signed in
```

`vms-core` is deliberately free of both Tauri and Axum. Its tests are the
regression signal for everything above it, and they must not need a server
running to pass.

## Self-Hosted Rule

The client's data must stay on hardware the client owns. Do not add analytics,
telemetry, or a third-party service that stores fleet records.

The app is reachable over the internet — that is the point of v0.4.0 — but
"online" here means the client's own computer answering from behind a tunnel,
not somebody else's cloud.

Acceptable:

1. Read/write the SQLite database on the server machine.
2. Read/write app-managed documents and images on the server machine.
3. Serve those files to signed-in people over HTTPS.
4. Generate backups, on the server machine or to storage the client controls.
5. Start with the operating system.

Not acceptable without a decision from the client:

1. Any managed database, object store, or analytics service.
2. Anything that bills monthly.

## Suggested Folder Structure

```text
tog5-vms/
  src/
    app/
      routes/
      layout/
      providers/
    components/
      common/
      forms/
      dashboard/
      vehicles/
      fuel/
      maintenance/
      reports/
    domain/
      vehicles/
      fuel/
      maintenance/
      alerts/
      expenses/
    services/
      api/
      validation/
      formatting/
      files/
    types/
    utils/
  crates/
    vms-core/
      src/
        auth/
        backup/
        db/
        domain/
        vehicles/ fuel/ trips/ maintenance/ expenses/ reports/ settings/
      migrations/
    vms-server/
      src/
        routes/
        rpc/
      tests/
  src-tauri/
    src/
    shell/
  deploy/
  specs/
    *.md
  live-update.md
```

## Data Storage

Use SQLite as the main database, on the server machine.

Use file storage on that same machine for:

1. Vehicle photos.
2. Fuel receipts.
3. Repair receipts.
4. Maintenance receipts.
5. OR/CR documents.
6. Insurance documents.
7. Backups.

The database should store metadata and file paths, not large binary files unless there is a strong reason.

## Startup-on-Boot

The server starts with the computer it runs on, as a Windows service. The
`startup_on_boot_enabled` setting is kept because it is stored data, but the
thing that actually matters is the service registration — see `deploy/`.

## Notifications

Alerts appear in the app. Desktop notifications no longer make sense as the
primary channel, because the app is usually a browser tab or a phone rather
than a program running on the viewer's machine.

Push notifications are possible for a PWA but are not part of this version.

## Error Handling

Errors should be friendly and actionable.

Bad example:

`Constraint violation: fuel_logs_vehicle_id_foreign_key`

Good example:

`Fuel log could not be saved because the selected vehicle no longer exists.`

## Connection Assumption

Every feature needs a connection to the server. This is a deliberate reversal of
the offline-first rule that held until v0.4.0, and the cost is real: a driver
with no signal cannot record a trip until they are back in range.

Do **not** try to soften this with local caching of fleet data. A stale odometer
reading or a fuel log that quietly disappears is worse than a screen that says
it cannot reach the server. The service worker caches the app shell so it opens
instantly; it never caches data.

If offline entry is genuinely needed later, it is a project of its own —
conflict resolution, not a cache.

## Availability

One office computer runs everything, which makes it a single point of failure.
That is an accepted trade for now, against the cost and the client's
preferences. Two things keep it from being reckless:

1. A nightly backup written to storage that is not that computer's disk.
2. Nothing in the design ties the app to that machine. Moving it to a small VPS
   is a recompile and a file copy.
