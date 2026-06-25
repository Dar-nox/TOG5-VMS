# 07 — Development Phases

This file defines the project phases for Codex-driven implementation.

Prompts will be written later. For now, this document defines the intended order, outputs, and success criteria.

After each phase, update `live-update.md`.

---

# Phase 0 — Repository and Workflow Setup

## Objective

Create the initial repository structure and establish development rules for Codex.

## Expected Outputs

1. Project folder initialized.
2. Specification files stored in repo.
3. `AGENTS.md` present.
4. `live-update.md` present.
5. Basic README present.
6. Git initialized, if appropriate.

## Success Criteria

1. Codex can identify project purpose from specs.
2. Human can track progress through `live-update.md`.
3. No application code is required yet.

## Completion Gate

`live-update.md` contains a Phase 0 entry.

---

# Phase 1 — App Scaffold

## Objective

Set up the desktop app foundation using the selected stack.

## Expected Outputs

1. Tauri + React + TypeScript project scaffold.
2. Basic app shell.
3. Sidebar layout placeholder.
4. Route/page placeholders.
5. Initial styling setup.
6. Basic development scripts.

## Suggested Pages to Stub

1. Dashboard.
2. Vehicles.
3. Fuel Logs.
4. Maintenance.
5. Service History.
6. Expenses.
7. Reports.
8. Alerts.
9. Backup.
10. Settings.

## Success Criteria

1. App runs locally in development.
2. TypeScript compiles.
3. Basic shell is visible.
4. No database dependency yet unless easy to include.

## Completion Gate

Run and record:

1. Install command.
2. Dev command.
3. Typecheck/build result.

---

# Phase 2 — Database Foundation and Migrations

## Objective

Create the SQLite persistence foundation.

## Expected Outputs

1. SQLite database setup.
2. Migration system.
3. Initial tables from `03-data-model.md`.
4. Seed data for maintenance templates.
5. Basic database access layer.
6. Safe initialization on app startup.

## Priority Tables

1. vehicles.
2. vehicle_photos.
3. vehicle_documents.
4. vehicle_features.
5. fuel_logs.
6. maintenance_templates.
7. maintenance_template_rules.
8. vehicle_maintenance_settings.
9. maintenance_schedules.
10. maintenance_logs.
11. expenses.
12. alerts.
13. settings.

## Success Criteria

1. Database initializes locally.
2. Tables are created through migrations.
3. Seed maintenance templates are inserted idempotently.
4. No external database/server required.

## Completion Gate

Record migration files and database initialization result in `live-update.md`.

---

# Phase 3 — Domain Models and Validation

## Objective

Create shared TypeScript/Rust domain models and validation rules.

## Expected Outputs

1. Vehicle types/enums.
2. Fuel log types/enums.
3. Maintenance template types/enums.
4. Alert types/enums.
5. Expense types/enums.
6. Validation utilities.
7. Friendly validation messages.

## Must Include Rules

1. Vehicle name required.
2. Vehicle picture required.
3. Plate number optional.
4. Odometer cannot be negative.
5. Fuel liters greater than 0.
6. Diesel/gasoline maintenance applicability rules.
7. Full-tank fuel efficiency rule.

## Success Criteria

1. Types are reusable by UI and data layer.
2. Validation errors are human-readable.
3. Business rules are not buried in UI components.

## Completion Gate

Record created model/validation files and any tests.

---

# Phase 4 — Vehicle Module

## Objective

Implement adding, editing, viewing, listing, and archiving vehicles.

## Expected Outputs

1. Vehicle list page.
2. Vehicle profile page.
3. Add/edit vehicle form or wizard.
4. Vehicle photo upload.
5. Optional plate number.
6. Vehicle classification fields.
7. Vehicle status handling.

## Success Criteria

1. User can add a vehicle with name and photo.
2. User can save fuel type, vehicle type, odometer, transmission, and drivetrain.
3. Plate number is optional.
4. Vehicle appears on the vehicle list and dashboard placeholder.
5. User can edit/archive vehicle.

## Completion Gate

Create at least one sample vehicle and verify persistence after restart.

---

# Phase 5 — Maintenance Template Engine

## Objective

Implement smart maintenance template selection based on vehicle profile.

## Expected Outputs

1. Seed maintenance templates.
2. Template rules.
3. Applicability evaluator.
4. Per-vehicle maintenance settings.
5. Review suggested maintenance tasks during vehicle setup.
6. User override warning.

## Required Logic

1. Diesel vehicles exclude spark plug auto-suggestion.
2. Gasoline vehicles exclude DEF/AdBlue auto-suggestion.
3. Full EVs exclude engine oil/fuel/exhaust tasks.
4. Manual vehicles suggest clutch tasks.
5. Automatic/CVT/DCT vehicles suggest matching fluid tasks.

## Success Criteria

1. Diesel vehicle receives diesel tasks, not gasoline ignition tasks.
2. Gasoline vehicle receives spark plug task, not DEF/AdBlue task.
3. User can disable a suggested maintenance task.
4. User can manually add a mismatched task after warning.

## Completion Gate

Record sample applicability test cases in `live-update.md`.

---

# Phase 6 — Maintenance Scheduling and Alerts

## Objective

Create live maintenance schedules, due-soon/overdue detection, and alerts.

## Expected Outputs

1. Maintenance schedule records.
2. Due date and due odometer calculation.
3. Due soon status.
4. Overdue status.
5. Alert generation.
6. Alert list page.
7. Snooze/dismiss/resolve behavior.

## Required Logic

1. Date interval.
2. Odometer interval.
3. Whichever comes first.
4. Due soon by days.
5. Due soon by km.
6. Overdue by days.
7. Overdue by km.

## Success Criteria

1. Oil change can be due by 3 months or 5,000 km.
2. Due-soon alerts appear before due.
3. Overdue alerts remain active until resolved.
4. Completing maintenance resolves related alerts.

## Completion Gate

Record tested due-soon and overdue scenarios.

---

# Phase 7 — Fuel Logging and Efficiency

## Objective

Implement fuel logs, receipt upload, and fuel efficiency calculation.

## Expected Outputs

1. Fuel log list page.
2. Add fuel log form.
3. Receipt attachment support.
4. Odometer validation.
5. Fuel type mismatch warning.
6. Full-tank rule.
7. km/L calculation.
8. Cost/km calculation.
9. Fuel efficiency drop alert.

## Success Criteria

1. User can add fuel log.
2. Fuel efficiency is calculated when valid.
3. Non-full-tank logs are saved but not treated as official efficiency.
4. Odometer decrease warning works.
5. Fuel receipt is locally stored.

## Completion Gate

Record sample fuel logs and calculation results.

---

# Phase 8 — Maintenance Completion and Service History

## Objective

Allow users to mark maintenance completed and keep service history.

## Expected Outputs

1. Complete maintenance form.
2. Maintenance log creation.
3. Receipt upload.
4. Cost entry.
5. Parts replaced.
6. Mechanic/shop field.
7. Next due recalculation.
8. Service history page.

## Success Criteria

1. User can complete maintenance from an alert or schedule.
2. Service history records are saved.
3. Related expense is created.
4. Next due schedule is calculated.
5. Alert is resolved.

## Completion Gate

Record one completed service flow.

---

# Phase 9 — Expenses and Reports

## Objective

Implement expense tracking and basic reports.

## Expected Outputs

1. Expense list page.
2. Add/edit expense form.
3. Fuel expenses from fuel logs.
4. Maintenance expenses from maintenance logs.
5. Basic report screens.
6. CSV export.
7. Printable/PDF-ready views if possible.

## Required Reports

1. Monthly expenses.
2. Cost per vehicle.
3. Fuel efficiency report.
4. Upcoming maintenance.
5. Overdue maintenance.
6. Service history.

## Success Criteria

1. Reports filter by date range.
2. Reports filter by vehicle.
3. CSV export works for at least one report.
4. Expense totals match underlying records.

## Completion Gate

Record sample report outputs.

---

# Phase 10 — Backup, Restore, and Local File Safety

## Objective

Protect local data through backup and restore.

## Expected Outputs

1. Manual backup.
2. Restore backup.
3. Backup includes database and files.
4. Backup reminder alert.
5. Backup settings.
6. Friendly restore warning.

## Success Criteria

1. Backup creates a restorable package/folder.
2. Restore recovers database and files.
3. App handles missing files gracefully.
4. Backup reminder can be configured.

## Completion Gate

Record backup/restore test result.

---

# Phase 11 — User Access and Settings

## Objective

Implement login, local users, roles, and settings.

## Expected Outputs

1. Login screen.
2. Local user storage.
3. Password hashing.
4. Admin/staff/viewer roles.
5. Settings page.
6. Startup-on-boot setting.
7. Due-soon default settings.

## Success Criteria

1. Admin can access all features.
2. Staff cannot manage users/settings unless allowed.
3. Viewer cannot edit records.
4. Startup-on-boot setting can be toggled.

## Completion Gate

Record role tests and settings changed.

---

# Phase 12 — Dashboard Polish and UX Refinement

## Objective

Make the application feel complete, understandable, and easy to use.

## Expected Outputs

1. Improved dashboard.
2. Empty states.
3. Tooltips/help text.
4. Better loading/error states.
5. Consistent status colors.
6. Search/filter improvements.
7. Confirmation modals.
8. Basic accessibility pass.

## Success Criteria

1. User can understand what to do on each page.
2. Important alerts are visible.
3. Required fields are obvious.
4. Errors are friendly.
5. UI is consistent.

## Completion Gate

Record UX checklist results.

---

# Phase 13 — Packaging and Release Preparation

## Objective

Prepare the app for installation and client testing.

## Expected Outputs

1. Production build.
2. Windows installer/package.
3. App icon placeholder or final icon.
4. Version number.
5. Basic release notes.
6. Basic user guide.

## Success Criteria

1. App installs on target Windows machine.
2. App opens after install.
3. Local database initializes.
4. Startup-on-boot setting works.
5. No development-only debug screens remain visible.

## Completion Gate

Record installer test result.

---

# Phase 14 — Client Testing and Fixes

## Objective

Test with realistic usage and fix issues.

## Expected Outputs

1. Bug list.
2. Fixes for critical issues.
3. Data entry validation improvements.
4. Report corrections.
5. Client feedback notes.

## Success Criteria

1. Client can add vehicles.
2. Client can log fuel.
3. Client can complete maintenance.
4. Client can read dashboard alerts.
5. Client can back up data.

## Completion Gate

Record client test feedback and remaining items.
