# 00 — Project Brief

## Project Name

**TOG 5 VMS** — Vehicle Maintenance System

## Application Type

Local desktop application for Windows 10/11.

## Core Goal

Build a private, offline, user-friendly desktop app that helps the client manage vehicles, fuel logs, maintenance schedules, service history, expenses, documents, and alerts.

## Key Requirements

1. Desktop app.
2. Local-only data storage.
3. No cloud dependency.
4. Startup-on-boot capable.
5. Vehicle name and uploaded vehicle picture are the main identifiers.
6. Plate number is optional.
7. Fuel logs must support receipt attachments and odometer readings.
8. Fuel efficiency must be calculated from odometer distance and liters purchased.
9. Maintenance must be scheduled by date, odometer, or whichever comes first.
10. Maintenance alerts must warn users when service is almost due or overdue.
11. The system must estimate next maintenance date based on vehicle usage.
12. Maintenance templates must adapt to vehicle type and fuel type.
13. Diesel vehicles must not automatically receive gasoline-only tasks such as spark plug replacement.
14. The UI must be friendly for users who are only moderately technical.

## Primary Users

1. Admin or owner.
2. Maintenance-in-charge.
3. Staff who log fuel or maintenance.
4. Viewer who only checks reports.

## User-Friendliness Standard

The app should feel like a practical office tool, not a mechanic-only technical system. Use plain words, clear buttons, helpful tooltips, readable cards, and guided forms.

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
12. Backup and restore.
13. Settings and user access.

## Version 1 Priority

Version 1 should focus on a solid local MVP that handles gasoline and diesel vehicles well. Hybrid and EV support should be structurally supported but may be simpler in the first build.
