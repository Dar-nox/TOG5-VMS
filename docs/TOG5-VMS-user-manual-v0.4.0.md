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

- Everyone has their own account and password.
- You need an internet connection. There is no offline mode — if there is no
  signal the app says so rather than pretending to save.
- Photos and receipts are stored online, not in a folder on a PC.
- Backups work differently. See section 12.

**The screens were rebuilt as well**, for phones as much as for computers:

- Everything about one vehicle now lives on that vehicle's own page, in tabs.
  There are five places to go instead of eleven. See section 4.
- Trips record the odometer when a vehicle leaves and when it comes back, and
  fuel or costs can be recorded from inside an open trip.
- Reports print as a proper document, and list every underlying record rather
  than totals alone.
- You can be sent a notification when something needs attention, if you want
  one.

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

If the app says _"That email and password combination did not work"_, it does
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

|                                           | Owner | Manager | Viewer |
| ----------------------------------------- | ----- | ------- | ------ |
| Record vehicles, fuel, trips, maintenance | yes   | yes     | yes    |
| Let people in, change roles               | yes   | no      | no     |
| Change settings everyone shares           | yes   | no      | no     |

Manager and viewer are the same today. The difference exists so limits can be
added later without a rebuild.

## 4. Navigation

There are five places to go. On a computer they are down the left; on a phone
they are along the bottom, in reach of a thumb.

- **Dashboard** — what needs attention today, and which vehicles are out.
- **Vehicles** — every vehicle, and everything about each one.
- **Alerts** — what is due or overdue.
- **Reports** — costs and trips across the whole fleet, printable.
- **Settings** — your account, your notifications, people, shared preferences,
  and the export.

**Everything about a vehicle is on that vehicle's page**, in tabs across the
top: Overview, Fuel, Maintenance, Service history, Trips, Expenses. So to record
a fill-up you open the van and then Fuel, rather than opening a fuel screen and
choosing the van from a list.

If there are more tabs than fit, the strip scrolls sideways and fades at the
edge to show there is more.

**Signing out** is top right on a phone, bottom left on a computer.

## 5. Dashboard

What needs attention today, which vehicles are out on the road, month-to-date
costs, and anything worth setting up.

**Out on the road** lists every vehicle currently away — driver, destination,
how long it has been gone, and what it has cost so far. Longest out first.
Tapping one opens that vehicle's trip.

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

- record a **fuel log** with a higher reading,
- record **completed maintenance** at a higher reading, or
- **close a trip** with a higher reading.

It never goes backwards. A fill-up entered late, with an older reading, will
not wind the vehicle back — and neither will a trip closed days after it
finished. The trip keeps its own reading either way, so the distance it
travelled is still right.

The only way it goes down is somebody editing the vehicle by hand, which is
worth knowing if a reading is ever typed in far too high.

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

You can also record a fill-up **from inside an open trip** — see section 9. It
saves nothing different; it just fills in the vehicle, the date and the reading
for you, and ties the receipt to that trip.

## 8. Maintenance

### Finding an item

A well-kept vehicle carries thirty-odd maintenance items, and the list is
ordered by what is most urgent rather than alphabetically. Once there are more
than five, a search box appears above it. Typing "brake" finds the pads, the
fluid and the inspection together, because it matches the category as well as
the name.

### Items and reminders

A _maintenance item_ is a job — "Engine Oil Change". A _reminder_ is that job
set up on one vehicle, with its own interval in days or kilometres.

The list shows items your fleet actually uses, not every item the app knows
about.

Items adapt to the vehicle. A diesel truck is never told to change its spark
plugs; an EV is never told to change its oil. Where it is unclear the app lets
you add it anyway and warns you.

### How much notice you get

Each reminder has two numbers, and they do different jobs:

- **Every** — how often the work is due. "Every 180 days or 5,000 km".
- **Warn** — how much notice you want. "Warn 14 days early" means the item
  turns amber for the last fortnight before it is due.

Both are on the **Intervals** button, and each row shows what it is set to. Leave
the warn boxes empty to use the fleet setting from Settings.

The warning has to be shorter than the interval. Ask to be warned 170 days
before something due every 180 days and the item is amber almost permanently,
which makes the colour meaningless — so the app refuses it, and marks any
reminder whose warning covers more than half its own interval.

### Logging work

Record what was done, when, at what reading, and the cost. Attach the receipt
and before/after photos.

If the vehicle has a reminder for that job, completing it moves the reminder
forward and clears its alert. If it does not, the work is still recorded — the
app tells you to set a reminder if you want future dates tracked.

## 9. Trips

A trip is a vehicle going out and coming back: when it left, who drove, who went
along, where to, and why. Drivers, passengers and destinations each get their
own box, with a spare one at the end — type in it and another appears.

Only one trip can be open per vehicle at a time.

### The readings

Starting a trip fills in the odometer from the vehicle, so usually you leave it
alone. Closing one asks for the reading again, and **that** is the number that
moves the vehicle forward.

Both can be left empty if nobody looked. A reading below the one the trip
started on is refused, and one implausibly far above asks whether you are sure —
too high is the only mistake that cannot be undone by typing over it.

### Fuel and costs on a trip

An open trip has **Log fuel** and **Add cost**. Both open the ordinary form with
the vehicle, date and reading already filled in, and tie what you record to that
trip — so the trip shows what it cost, fuel and tolls together.

You do not have to use them. The Fuel and Expenses tabs work on their own
exactly as before, which is what you want for a yard top-up or a receipt found
in a pocket a week later.

### Keeping a trip in reach (phones)

On a phone an open trip can be **pinned**. It sits in your notification shade
alongside everything else, and tapping it opens the trip — including after the
app has been closed. Unpin it, or close the trip, and it goes.

A trip closed by somebody else on another device clears from your phone the next
time you open the app rather than the moment they do it.

## 10. Alerts

Raised when maintenance is due soon or overdue, and when fuel efficiency drops
noticeably.

**Dismissing an alert silences it for good** for that reminder. Use it when you
have dealt with something outside the app. If you want it back, complete the
work properly or set the reminder up again.

## 11. Reports

Costs and trips across the whole fleet, filtered by vehicle and by date.

Both tabs show the totals **and every record behind them** — every cost with its
date, vehicle and description; every trip with its driver, passengers,
destinations, purpose and distance. The summaries are there to be read at a
glance, the lists to look something up.

### Printing

**Print** produces a document, not a screenshot of the screen: the fleet name, a
title, the vehicles and period it covers, when it was taken, ruled tables whose
headings repeat if a table runs over a page, totals, and space to sign.

Print whichever tab you are on. Printing is not available in the Android app;
open the site in Chrome for that.

There are no page numbers. Browsers do not offer them, so every page carries the
report name and period instead.

### CSV

**Download CSV** gives the per-vehicle cost summary as a spreadsheet file. On a
phone it goes through the share sheet instead of downloading, so you can send it
straight to email or save it where you like.

**Costs are never counted twice.** An expense marked as matching a fuel log or
service record is not added on top of it, so the totals stay honest even when
the same cost was typed in twice.

## 12. Backup — read this one

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

## 13. Settings

**Your name** — what everybody else sees against everything you record. Change
it here.

**Your password** — change it here.

**Notifications** — see section 14.

**People** (owners only) — who is waiting to be let in, who is working, and
what each person may do. Switching somebody off keeps everything they recorded;
it only stops them signing in.

**Add someone** creates an account there and then: name, email, a starting
password, and whether they are a manager or a viewer. They can sign in straight
away — pass them the password and tell them to change it under **Your password**.
Nothing forces them to. People can still sign themselves up from the sign-in
screen instead, and those land in the waiting list.

There must always be one owner, so the last one cannot switch themselves off.

**Make owner** hands the fleet to somebody else and makes you a manager. Use it
before the owner leaves the company, not after — an owner is the only account
that can let people in, and only the new owner can hand it back.

**Archived records** (owners only) — everything that has been archived, and a
**Restore** button beside each one. Archiving never deletes anything, so a trip,
fuel log, expense or reminder removed by mistake can be put back exactly as it
was. Press **Show** to load the list.

**Shared preferences** (owners only) — currency, units, date format, how far
ahead reminders warn, and which alerts are created. These apply to everybody.

**Exports** — how often to be reminded, and when the last one was taken.

## 14. Notifications

The app can send you a notification when something needs attention, so you are
told without having to open it and look.

**It is off until you turn it on**, and it is per device: the office computer
and your phone are switched on separately, because a notification belongs to the
browser it was set up in. Your phone will ask permission the first time. If you
say no, the app cannot ask again — you would have to allow it in the browser's
own settings.

Once it is on, you choose:

|                            |                                                                                                                        |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Send at**                | What time it arrives.                                                                                                  |
| **Tell me about**          | Anything due soon and overdue, or only what is overdue.                                                                |
| **Which days**             | Every day, or weekdays only.                                                                                           |
| **Trips still open after** | Hours a trip may stay out before it is mentioned. Usually it means somebody forgot to close it. Leave empty to ignore. |

These are yours, not the fleet's — an owner and a driver can want different
things.

**One message a day, not one per item.** It names how much needs attention and
which vehicles, and opens Alerts when tapped. If nothing is due, nothing is
sent: a daily message saying all is well is how people learn to ignore it.

It works on Android with the app added to your home screen, and on a computer
while the browser is running. On iPhone it is unreliable and not promised.

## 15. When something goes wrong

| What you see                                       | What it means                                                                           |
| -------------------------------------------------- | --------------------------------------------------------------------------------------- |
| "That email and password combination did not work" | One of the two is wrong. It will not say which.                                         |
| "Waiting to be let in"                             | Your account exists but an owner has not approved it.                                   |
| "This account is switched off"                     | An owner disabled it. Your records are intact.                                          |
| "This device is offline"                           | No internet at your end. Check the wi-fi or data, then try again.                        |
| "TOG 5 VMS is not answering"                       | Your connection is fine; the app's server is not responding. Nothing at the office will fix it — tell whoever set the app up. |
| Everything is empty after signing in               | Usually the same as "waiting to be let in".                                             |
| "TOG 5 VMS is not configured"                      | The app was built without its database settings. Whoever deployed it needs to fix that. |

If the app has not been used for a while it may take a few seconds to wake up
the first time. That is normal on the free plan.

## 16. What it deliberately does not do

- Work without an internet connection.
- Track vehicles by GPS.
- Read receipts automatically.
- Look up manufacturer schedules.
- Send your records to anyone outside your fleet.

One honest caveat on the last one, if you turn notifications on: the message has
to travel through your phone maker's notification service, the same one every
other app uses. It is scrambled before it leaves and can only be unscrambled by
your own phone, so they carry it without being able to read it. Nothing else in
the app ever leaves.
