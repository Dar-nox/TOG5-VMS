# vms-server

The TOG 5 VMS HTTP server. One executable that serves the web app, the API, and
the vehicle photos and receipts, backed by the same SQLite file the desktop
build used.

## What it exposes

| Route                       | Sign-in | Purpose                                              |
| --------------------------- | ------- | ---------------------------------------------------- |
| `GET /healthz`              | no      | Liveness check for the Windows service watchdog       |
| `GET /api/auth/status`      | no      | Whether first-run setup is needed, and who is signed in |
| `POST /api/auth/setup`      | no      | One-time owner password; refuses once one is set      |
| `POST /api/auth/login`      | no      | Sign in; rate limited per caller                      |
| `POST /api/auth/logout`     | no      | Ends the session in the cookie                        |
| `POST /api/rpc/{command}`   | yes     | Every application command                             |
| `GET /api/files/{kind}/{name}` | yes  | Vehicle photos and receipts                           |
| everything else             | no      | The built web app, falling back to `index.html`       |

`/api/rpc/{command}` takes the same JSON object the desktop build passed to
Tauri's `invoke`, and answers with the command's result or
`{ "error": "a message written for the person using the app" }`.

Six commands are owner-only: `clear_app_data`, `restore_backup`,
`reset_app_settings`, `update_local_user`, `create_local_user`, and
`set_local_user_password`. Everybody else can do all the day-to-day work.

## Settings

All optional; the defaults are what a normal install wants.

| Variable             | Default                        | Notes                                                        |
| -------------------- | ------------------------------ | ------------------------------------------------------------ |
| `VMS_BIND_ADDRESS`   | `127.0.0.1:8787`               | Loopback, because Cloudflare Tunnel is the public route       |
| `VMS_DATA_DIR`       | `%APPDATA%\com.tog5.vms`       | Same folder the desktop build used, so existing data is found |
| `VMS_WEB_DIR`        | `dist` beside the executable   | Leave unset in development and use the Vite dev server        |
| `VMS_SECURE_COOKIES` | `true`                         | Set to `false` only for plain-HTTP development                |
| `VMS_LOG`            | `info`                         | Standard `tracing` filter, e.g. `vms_server=debug`            |

## Running it in development

```sh
VMS_DATA_DIR=./.dev-data VMS_SECURE_COOKIES=false cargo run -p vms-server
```

Then open the web app with `npm run dev` and let Vite proxy `/api` to
`127.0.0.1:8787`. On first run, POST a password to `/api/auth/setup`, or use
the app's setup screen. **There is no default password, and there never will
be.**

## Two things worth knowing

**Restores need a restart.** The server holds pooled SQLite connections open,
so replacing the database file underneath them would corrupt it.
`restore_backup` validates the package, takes a safety backup, and stages the
payload; the server then stops, and the restore is applied on the next start,
before anything opens the database. Under a service manager configured to
restart on exit this looks like a brief pause. If a restore is interrupted, the
staged payload survives and is applied on the following start.

**Forwarding headers are trusted.** `CF-Connecting-IP` and `X-Forwarded-For`
decide who a caller is for rate limiting and the session log. That is only safe
because the server is meant to listen on loopback with Cloudflare Tunnel in
front of it. If you ever bind it to a public interface, stop trusting them
first.
