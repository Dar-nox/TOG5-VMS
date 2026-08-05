# 00 — Project Brief

## Project Name

**TOG 5 VMS** — Vehicle Maintenance System

## Application Type

Web application, reachable from anywhere. Installable on a phone from the
browser, with an Android app and a Windows app that wrap the same build.

## Core Goal

Help the client manage vehicles, fuel logs, maintenance schedules, service
history, expenses, documents, and alerts — for several staff at once, from
wherever they happen to be.

## How this changed

Version 0.3 and earlier were a single-seat Windows app keeping everything in a
SQLite file on one machine. That was the brief at the time and it was met.

It stopped fitting once several people needed the same records: whoever was not
sitting at that PC could not record anything, and there was no way to see what
somebody else had done. Version 0.4 moves the records to a hosted Postgres
database (Supabase), which every device talks to directly.

Two constraints shaped that choice and still hold:

* **No paid subscriptions yet.** Everything runs inside free allowances, and
  the plan upgrades in one click when the fleet outgrows them.
* **Nothing of the client's has to stay switched on.** No office PC acting as a
  server. If everybody goes home and turns everything off, the app still works
  from a phone.

## Key Requirements

1. Reachable from anywhere, on a phone or a computer.
2. Several people using it at once, each with their own account.
3. Records shared: what one person saves, everybody sees.
4. No paid subscription, and no machine of the client's kept running.
5. Vehicle name and uploaded vehicle picture are the main identifiers.
6. Plate number is optional.
7. Fuel logs must support receipt attachments and odometer readings.
8. Fuel efficiency must be calculated from odometer distance and liters
   purchased.
9. Maintenance must be scheduled by date, odometer, or whichever comes first.
10. Maintenance alerts must warn users when service is almost due or overdue.
11. The system must estimate next maintenance date based on vehicle usage.
12. Maintenance templates must adapt to vehicle type and fuel type.
13. Diesel vehicles must not automatically receive gasoline-only tasks such as
    spark plug replacement.
14. The UI must be friendly for users who are only moderately technical.

## Online only, on purpose

Confirmed with the client: there is no offline mode and no sync queue. A driver
with no signal cannot record anything.

What the app must do instead is **fail visibly**. Nothing is accepted and then
quietly lost — if a save cannot reach the database it says so, and the person
still has what they typed on screen. A record that vanishes silently is worse
than one that was never taken.

## Primary Users

1. Owner — lets people in, changes settings, exports the records.
2. Maintenance-in-charge.
3. Staff who log fuel or maintenance.
4. Viewer who only checks reports.

Everyone signs in with their own account. Anyone can create one; nobody sees
anything until an owner admits them.

## User-Friendliness Standard

The app should feel like a practical office tool, not a mechanic-only technical
system. Use plain words, clear buttons, helpful tooltips, readable cards, and
guided forms.

Increasingly it is used on a phone, so screens have to work at that size.

## Core Modules

1. Dashboard.
2. Vehicle management.
3. Fuel logging.
4. Smart maintenance template engine.
5. Maintenance schedules.
6. Maintenance completion logs.
7. Repair/service history.
8. Expense tracking.
9. Alerts and notifications.
10. Reports.
11. Documents and photos.
12. Export.
13. Settings and user access.

## Current Priority

Gasoline and diesel vehicles are handled well. Hybrid and EV are structurally
supported but simpler.

A UI overhaul is planned now that the move online is done: the current design is
dated, heavy on cards, and has layout problems that are known and deliberately
being lived with until then.
