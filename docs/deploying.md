# Deploying TOG 5 VMS

Three ways to reach the same app: a website, an Android app, and a Windows app.
They are the same build talking to the same Supabase project — nobody sees
different records depending on how they opened it.

## What has to exist first

* The Supabase project. Migrations are applied with
  `PGPASSWORD='...' supabase/push.sh` (see `supabase/README.md`).
* Two settings, which are all the app needs to find its database:

  ```
  VITE_SUPABASE_URL=https://<project-ref>.supabase.co
  VITE_SUPABASE_ANON_KEY=sb_publishable_...
  ```

  Both belong in the host's environment variables, not in the repository.
  `.env.example` shows the shape; `.env.local` is git-ignored.

The publishable key is meant to be public — it ships inside the JavaScript and
anyone can read it. It is not what keeps the data safe. Row level security is,
and it is enforced by Postgres on every request regardless of which key was
used or what the app asked for.

## The website

```sh
npm run build          # writes dist/
```

`dist/` is a folder of static files. Any static host will serve it —
**Cloudflare** is the one in use: generous free tier and no cold starts.

Two settings matter, whichever host:

* **Build command** `npm run build`, **output directory** `dist`
* The two `VITE_SUPABASE_*` variables, set at build time. Vite bakes them into
  the bundle, so changing them means rebuilding — they are not read at runtime.

`wrangler.jsonc` holds the Cloudflare deploy settings and is committed
deliberately. Left out, wrangler regenerates one on every build and answers its
own setup prompts from defaults, so the configuration ends up somewhere nobody
can read it.

A path that matches no file serves `index.html`, set by
`not_found_handling: "single-page-application"`. A `_redirects` file used to do
that job and was rejected — Cloudflare reads `/* /index.html 200` as a rule
that triggers itself, and fails the deploy rather than the build, which is
after everything else has already looked fine. On Netlify or a similar host,
`_redirects` is the right answer instead.

### Installing it on a phone

The website *is* the phone app for most people. Open it in Chrome, then "Add to
Home screen". It gets an icon, opens without the address bar, and updates
itself whenever the site is redeployed — no store, no APK, nothing to
distribute.

Prefer this over the APK unless somebody specifically needs an installed app.

## The Android app

Only needed for people who want a real installed app. It is the same web build
wrapped in a webview.

```sh
npm run build
npx cap add android      # first time only, creates android/
npx cap sync             # after every web build
npx cap open android     # opens Android Studio, build the APK from there
```

Needs Android Studio and a JDK. The `android/` folder is generated — commit it
if several people build the app, leave it out if only one person does.

The app's files are packaged into the APK rather than fetched from the web.
That means **shipping a change requires a new APK**, which is the cost of the
app opening and explaining itself when the signal is bad rather than showing a
browser error page. If that trade stops being worth it, `capacitor.config.ts`
is where it changes.

## The Windows app

```sh
npm run tauri:build
```

Produces an installer under `src-tauri/target/release/bundle/`.

Like the Android build it packages the web app rather than pointing at the
website, for the same reason.

## Updating

* **Website and phones running it** — redeploy. Everyone has it on next open.
* **Android** — build and distribute a new APK.
* **Windows** — build and distribute a new installer.
* **Database** — `supabase/push.sh` applies whatever is outstanding.

Nothing here needs a machine at the office to stay switched on. If everybody
goes home and turns everything off, the app still works from a phone.

## When something is wrong

`supabase/README.md` covers the database. Beyond that:

* **"TOG 5 VMS is not configured"** — the two `VITE_SUPABASE_*` variables were
  missing at build time. Rebuild with them set.
* **"Cannot reach TOG 5 VMS"** — the app loaded but the database did not
  answer. Usually the connection; check the Supabase project is not paused.
  A free project pauses after a week with no activity and is resumed from the
  dashboard.
* **Everything is empty after signing in** — the account is probably waiting to
  be let in. An owner admits it from Settings → People.
