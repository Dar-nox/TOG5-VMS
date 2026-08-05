# TOG 5 VMS User Manual

Version: 0.4.0
Audience: everyone using TOG 5 VMS
Platform: any phone or computer with a browser

## 1. What changed in this version

Until now TOG 5 VMS lived on one computer. Only the person sitting at it could
record anything, and nobody else could see what had been done.

It is now online. The same records are reachable from any phone or computer,
several people can use it at once, and what one person saves everybody sees
straight away. Nothing at the office has to stay switched on.

**What this means day to day:**

* Everyone has their own account and password.
* You need an internet connection. There is no offline mode — if there is no
  signal the app says so rather than pretending to save.
* Photos and receipts are stored online, not in a folder on a PC.
* Backups work differently. See section 11.

Your existing records were all moved across: ten vehicles, their maintenance
items and reminders, service history, fuel logs, trips, photos and receipts.
Nothing was left behind.

## 2. Getting in

### Opening it

Open the address you were given in any browser.

**On a phone, install it.** Open it in Chrome, tap the menu, and choose "Add to
Home screen". It gets an icon like any other app, opens without the address bar
and browser tabs, and updates itself. This is the recommended way to use it on
a phone.

### Signing in

Use your email address and password.

If the app says *"That email and password combination did not work"*, it does
not tell you which of the two was wrong. That is deliberate — otherwise the
sign-in form becomes a way for a stranger to find out who has an account.

### Your first time

When you create an account you will see **"Waiting to be let in"**. This is
normal. Anyone can create an account, so nobody gets access until the fleet
owner approves it. Ask them to open Settings → People and let you in, then tap
"Check again".

Until you are approved you can see nothing at all — not the vehicles, not the
records, nothing.

### If it says it cannot reach TOG 5 VMS

That is a connection problem, not a password problem. Check your signal or
wi-fi and press "Try again". Your password is not the issue and retyping it
will not help.

## 3. Who can do what

| | Owner | Manager | Viewer |
|---|---|---|---|
| Record vehicles, fuel, trips, maintenance | yes | yes | yes |
| Let people in, change roles | yes | no | no |
| Change settings everyone shares | yes | no | no |

Manager and viewer are the same today. The difference exists so limits can be
added later without a rebuild.

## 4. Navigation

The side menu:

- **Dashboard** — the fleet at a glance.
- **Vehicles** — add and manage vehicles.
- **Fuel Logs** — fuel purchases and efficiency.
- **Trips** — time out, drivers, passengers, destinations, returns.
- **Maintenance** — log work and manage items and reminders.
- **Service History** — completed maintenance.
- **Expenses** — costs not already recorded elsewhere.
- **Reports** — cost and trip reports, printing, CSV.
- **Alerts** — what needs attention.
- **Backup** — take a copy of everything.
- **Settings** — your account, people, and shared preferences.

## 5. Dashboard

Vehicle count, active alerts, fuel efficiency, monthly costs, export status,
things needing attention, and recent activity — including who did what.

Everything updates as soon as anybody records something.

## 6. Vehicles

Vehicle name and photo are the main identifiers; the plate number is optional.

Photos are shrunk automatically before upload. A photo straight off a phone
camera is around 3 MB, far more than the app needs, and shrinking them is what
keeps the fleet inside the free storage allowance.

### The odometer

The vehicle's current reading is what every distance-based reminder is measured
against, so keeping it current matters more than anything else in the app.

It moves forward on its own when you:

* record a **fuel log** with a higher reading, or
* record **completed maintenance** at a higher reading.

It never goes backwards. A fill-up entered late, with an older reading, will
not wind the vehicle back.

Whenever it moves, every reminder on that vehicle is re-checked and alerts
appear immediately — no matter who moved it or which screen they were on.

## 7. Fuel logs

Record the date, odometer, fuel type, litres, and either the price per litre or
the total — the app works out whichever you leave blank.

Attach the receipt by taking a photo of it.

**Full tank** matters. Efficiency can only be worked out between two full
tanks, so a partial fill is recorded but produces no reading, and the app says
why rather than leaving a blank.

DEF/AdBlue is recorded but never counted as fuel consumption.

## 8. Maintenance

### Items and reminders

A *maintenance item* is a job — "Engine Oil Change". A *reminder* is that job
set up on one vehicle, with its own interval in days or kilometres.

The list shows items your fleet actually uses, not every item the app knows
about.

Items adapt to the vehicle. A diesel truck is never told to change its spark
plugs; an EV is never told to change its oil. Where it is unclear the app lets
you add it anyway and warns you.

### Logging work

Record what was done, when, at what reading, and the cost. Attach the receipt
and before/after photos.

If the vehicle has a reminder for that job, completing it moves the reminder
forward and clears its alert. If it does not, the work is still recorded — the
app tells you to set a reminder if you want future dates tracked.

## 9. Alerts

Raised when maintenance is due soon or overdue, and when fuel efficiency drops
noticeably.

**Dismissing an alert silences it for good** for that reminder. Use it when you
have dealt with something outside the app. If you want it back, complete the
work properly or set the reminder up again.

## 10. Reports

Cost and trip reports, filtered by vehicle and date, printable, and exportable
as CSV.

The CSV downloads to wherever your device saves downloads. On a phone that is
usually the Downloads folder.

**Costs are never counted twice.** An expense marked as matching a fuel log or
service record is not added on top of it, so the totals stay honest even when
the same cost was typed in twice.

## 11. Backup — read this one

**Nothing takes an automatic copy of your records.** The plan this runs on does
not include automatic backups.

That makes the Backup screen the only copy you hold yourself. Press **Export
everything** and a single file downloads with every record in it: vehicles,
trips, fuel, service history, reminders, expenses, alerts, and who did what.

Do it regularly. Settings will remind you, and you can change how often.

Photos and receipts are not inside that file — they are too large. The export
lists every one of them and where it is, so nothing is unaccounted for.

Putting an export back is not something the app can do by itself. If it ever
comes to that, give the file to whoever looks after the system; it has
everything needed.

## 12. Settings

**Your account** — your name, and your password. Change your password here.

**People** (owners only) — who is waiting to be let in, who is working, and
what each person may do. Switching somebody off keeps everything they recorded;
it only stops them signing in.

There must always be one owner, so the last one cannot switch themselves off.

**Shared preferences** (owners only) — currency, units, date format, how far
ahead reminders warn, and which alerts are created. These apply to everybody.

**Exports** — how often to be reminded, and when the last one was taken.

## 13. When something goes wrong

| What you see | What it means |
|---|---|
| "That email and password combination did not work" | One of the two is wrong. It will not say which. |
| "Waiting to be let in" | Your account exists but an owner has not approved it. |
| "This account is switched off" | An owner disabled it. Your records are intact. |
| "Cannot reach TOG 5 VMS" | A connection problem. Not your password. |
| Everything is empty after signing in | Usually the same as "waiting to be let in". |
| "TOG 5 VMS is not configured" | The app was built without its database settings. Whoever deployed it needs to fix that. |

If the app has not been used for a while it may take a few seconds to wake up
the first time. That is normal on the free plan.

## 14. What it deliberately does not do

- Work without an internet connection.
- Track vehicles by GPS.
- Read receipts automatically.
- Look up manufacturer schedules.
- Send anything to anyone outside your fleet.
