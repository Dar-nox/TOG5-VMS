# src-tauri — the desktop shell

A window around TOG 5 VMS, and nothing more. The app itself runs on the server;
this crate exists so the client's staff get a familiar desktop icon that opens
straight into the app, with none of a browser's address bar, tabs, or menus in
the way.

It has no database, no commands, and no IPC. Everything it used to hold moved to
`crates/vms-core` and `crates/vms-server` during the v0.4.0 online migration.

## How it starts

1. On launch it reads `vms-shell.json` from beside the executable, writing a
   starter file the first time so there is something obvious to edit.
2. It opens `shell/index.html`, a launcher page that checks `/healthz`.
3. When the server answers, the window navigates to the app.
4. When it does not, the launcher says so in plain language and offers a
   **Try again** button — nobody ever sees a raw browser error page.

## Pointing it at the right server

`vms-shell.json`, in the install folder:

```json
{
  "serverUrl": "https://vms.example.com"
}
```

A fresh install points at `http://127.0.0.1:8787`, which is correct on the
machine that runs the server and wrong everywhere else. That is deliberate: it
is better than silently pointing at an address nobody checked.

## Building

```sh
npm run tauri:build
```

The shell no longer bundles the web app, so this does not build the frontend —
`frontendDist` is the `shell` folder. The result is a small NSIS installer.

## Phones and tablets

There is no mobile build here, and there should not be one: Android needs the
full SDK toolchain and iOS needs a Mac plus a paid Apple Developer account. On
a phone the app installs as a PWA instead — open it in the browser once, choose
**Add to Home Screen**, and it opens fullscreen with no browser chrome, exactly
like this shell does on the desktop.
