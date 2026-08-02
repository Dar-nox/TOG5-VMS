# Running TOG 5 VMS

TOG 5 VMS runs on one Windows computer in the office. Everything else — the
staff's phones, the laptops, the desktop shortcut — is just a window onto it.

There is nothing to subscribe to. The only recurring cost is a domain name,
about $10 a year, because a stable web address is what lets people keep the app
on their home screen.

- **No Docker.** A single Rust executable and one SQLite file have nothing to
  orchestrate, and Docker Desktop needs a paid licence above a company-size
  threshold.
- **No database server.** SQLite in WAL mode handles a fleet's worth of writes
  without breaking a sweat, and it is one file to back up.
- **No port forwarding.** Cloudflare Tunnel makes an outbound connection, so
  the router and firewall stay closed.

---

## What you need

| Thing                | Why                                                          |
| -------------------- | ------------------------------------------------------------ |
| A Windows 10/11 PC   | Runs the server. It has to stay on.                           |
| A domain on Cloudflare | Gives the app a stable address. ~$10/yr, the only cost.      |
| `cloudflared.exe`    | The tunnel. Free, single file, from Cloudflare.               |
| `WinSW.exe`          | Runs both as Windows services. Free, single file, from GitHub. |

---

## 1. Build

On a machine with Rust and Node installed:

```sh
cargo build --release -p vms-server
npm ci
npm run build
```

That gives you `target/release/vms-server.exe` and the web app in `dist/`.

## 2. Lay out the server folder

Copy onto the office PC, into something like `C:\TOG5-VMS\`:

```
C:\TOG5-VMS\
  vms-server.exe              from target/release/
  dist\                       the built web app
  vms-server-service.exe      WinSW.exe, renamed
  vms-server-service.xml      deploy/vms-server.xml, renamed
  cloudflared.exe
  cloudflared-service.exe     WinSW.exe, renamed again
  cloudflared-service.xml     deploy/cloudflared.xml, renamed
  cloudflared-config.yml      deploy/cloudflared-config.yml, filled in
  backup.ps1
  install-backup-task.ps1
```

The fleet data lives separately, in `C:\ProgramData\TOG5 VMS\`. Keep it out of
the program folder so upgrading the app can never touch it.

**Moving existing data across:** if the client has been using the desktop app,
copy `%APPDATA%\com.tog5.vms\` from that machine into
`C:\ProgramData\TOG5 VMS\`. The first start migrates it.

## 3. Start the server

From an elevated prompt in `C:\TOG5-VMS\`:

```
vms-server-service.exe install
vms-server-service.exe start
```

Check it:

```
curl http://127.0.0.1:8787/healthz
```

You should get `{"status":"ok"}`.

## 4. Put it on the internet

```
cloudflared tunnel login
cloudflared tunnel create tog5-vms
cloudflared tunnel route dns tog5-vms vms.yourdomain.com
```

`tunnel create` prints a tunnel id and writes a credentials JSON file. Put both
into `cloudflared-config.yml`, then:

```
cloudflared-service.exe install
cloudflared-service.exe start
```

Open `https://vms.yourdomain.com` from a phone **on mobile data, not office
wifi** — that is the only way to prove the tunnel is really carrying traffic.

> Use a **named** tunnel, not a quick `trycloudflare.com` one. Quick tunnels get
> a new random address every restart, which would break every phone with the app
> already on its home screen.

**Optional second lock:** turn on Cloudflare Access in front of the hostname
while the sign-in code is still new. It puts an identity check in front of the
app, so a bug in the app's own sign-in is not the only thing standing between
the internet and the client's data.

## 5. Set the owner password

Open the app. On a brand-new server it asks you to set the owner password.
There is no default password and there never will be one — this is the only way
the first account gets created.

Then add the rest of the staff from **Settings**. New accounts can do all the
day-to-day work; only the owner can clear data, restore a backup, reset
settings, or manage users.

## 6. Stop the PC sleeping

Control Panel → Power Options → set sleep and hibernate to **Never**. A sleeping
PC takes the whole company's app down with it.

## 7. Turn on backups

```powershell
.\install-backup-task.ps1 -Destination "\\nas\backups\TOG5-VMS"
Start-ScheduledTask -TaskName "TOG 5 VMS nightly backup"
```

Point `-Destination` at a **different disk or a network share**. A backup on the
same drive as the database does not survive that drive failing.

The task takes a consistent copy while the server keeps running, and prunes
packages older than 30 days — but only after a new one has been written, so a
run of failures can never leave the client with nothing.

---

## Installing the app on people's devices

**Phones and tablets.** Open the address in the browser once, then:

- **Android/Chrome:** it offers to install. Accept.
- **iPhone/Safari:** Share → **Add to Home Screen**. This is manual and easy to
  miss, so walk each person through it once.

Either way the icon opens fullscreen, with no address bar and no tabs.

**Desktops.** Install the TOG 5 VMS shell (`npm run tauri:build` produces the
installer), then edit `vms-shell.json` in the install folder:

```json
{ "serverUrl": "https://vms.yourdomain.com" }
```

It opens straight into the app, with no browser around it.

---

## Everyday operations

**Updating the app**

```
vms-server-service.exe stop
```

Replace `vms-server.exe` and `dist\`, then:

```
vms-server-service.exe start
```

Data is untouched: it lives in `C:\ProgramData\TOG5 VMS\`, and any new database
migrations run by themselves on the first start.

**Restoring a backup**

Do it from the Backup screen, signed in as the owner. The app validates the
package, takes a safety backup of what is there now, and stages the restore —
then the server stops on purpose so the restore can be applied on the next
start, before anything opens the database. The service restarts within about
five seconds, and the app comes back on the restored data.

That deliberate stop is why the service is configured to restart on failure:
the server exits with code 75 to say "a restore is staged, start me again."

If the machine loses power midway, nothing is lost — the staged restore is
still there and is applied on the following start.

**Reading the logs**

Both services write beside their `.exe`, rolling daily:

```
C:\TOG5-VMS\vms-server-service.out.log
C:\TOG5-VMS\cloudflared-service.out.log
```

---

## When something is wrong

**Nobody can reach the app.** Check `/healthz` on the PC itself first. If that
answers, the server is fine and the problem is the tunnel — check the
cloudflared log and that the service is running.

**The service keeps restarting.** Read `vms-server-service.out.log`. Exit code
75 is a staged restore finishing and is expected once. Anything else, usually
exit 1, is a real startup problem and the message will say what it is.

**Sign-in works locally but not through the address.** `VMS_SECURE_COOKIES` is
`true`, so the session cookie is only sent over HTTPS. That is correct through
Cloudflare. If you are testing over plain `http://`, set it to `false` for that
test and back afterwards.

**Somebody is locked out.** Ten wrong passwords in five minutes stops that
person trying for a while. It clears on its own, and restarting the service
clears it immediately.

**The owner password is lost.** There is no back door, by design. Restore a
backup from before the password was changed, or start from a fresh data folder
and restore the fleet data into it.
