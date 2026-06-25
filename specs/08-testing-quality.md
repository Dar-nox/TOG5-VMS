# 08 — Testing and Quality Specification

## Testing Philosophy

TOG 5 VMS handles important maintenance and expense records. Prioritize correctness, data safety, and clear validation.

## Minimum Testing Targets

1. Fuel efficiency calculations.
2. Odometer validation.
3. Maintenance due date calculation.
4. Maintenance due odometer calculation.
5. Maintenance applicability rules.
6. Alert generation.
7. Backup/restore.
8. Role permissions.

## Domain Test Cases

### Vehicle

1. Vehicle cannot be saved without name.
2. Vehicle cannot be saved without picture.
3. Vehicle can be saved without plate number.
4. Odometer cannot be negative.
5. Archived vehicle does not generate new alerts.

### Fuel Logs

1. Fuel log requires vehicle.
2. Fuel log requires odometer.
3. Fuel log requires liters greater than 0.
4. Fuel log requires total amount zero or greater.
5. Odometer lower than previous triggers warning.
6. Full-tank logs calculate official km/L.
7. Non-full-tank logs do not calculate official km/L.
8. Fuel type mismatch triggers warning.

### Fuel Efficiency

Given:

- Previous odometer: 10,000 km
- Current odometer: 10,350 km
- Liters: 35 L

Expected:

- Distance: 350 km
- Efficiency: 10 km/L

### Maintenance Applicability

Diesel vehicle:

1. Should include diesel fuel filter.
2. Should include water separator service.
3. Should include glow plug inspection if applicable.
4. Should not auto-include spark plug replacement.

Gasoline vehicle:

1. Should include spark plug replacement.
2. Should include ignition coil inspection.
3. Should not auto-include DEF/AdBlue check.
4. Should not auto-include DPF regeneration.

Full EV:

1. Should include EV battery health check.
2. Should include charging port inspection.
3. Should not include engine oil change.
4. Should not include fuel filter replacement.
5. Should not include spark plug replacement.

Manual transmission:

1. Should include clutch inspection.
2. Should include manual gear oil replacement.

Automatic transmission:

1. Should include automatic transmission fluid check/replacement.
2. Should not auto-include clutch pedal adjustment.

### Maintenance Scheduling

Oil change rule:

- Every 3 months OR 5,000 km, whichever comes first.

Test cases:

1. Due by date before odometer.
2. Due by odometer before date.
3. Due soon by days.
4. Due soon by km.
5. Overdue by days.
6. Overdue by km.

### Alerts

1. Due-soon maintenance creates alert.
2. Overdue maintenance creates alert.
3. Completed maintenance resolves alert.
4. Snoozed alert does not show as active until snooze expires.
5. Dismissed alert remains in history.

### Expenses

1. Fuel log creates fuel expense.
2. Maintenance completion creates maintenance expense.
3. Expenses cannot be negative.
4. Report totals match expense records.

### Backup and Restore

1. Backup includes database.
2. Backup includes local files.
3. Restore warns before replacing data.
4. Restore recovers test records.
5. Missing files are reported gracefully.

## Build/Quality Commands

Codex should run available commands after meaningful changes. Exact commands depend on setup, but likely include:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

For Tauri:

```bash
npm run tauri dev
npm run tauri build
```

Record actual command results in `live-update.md`.

## Manual QA Checklist

Before considering a phase complete, manually verify:

1. App opens.
2. Navigation works.
3. No obvious console errors.
4. Forms validate required fields.
5. Data persists after restart.
6. Alerts show correct statuses.
7. Reports reflect actual records.
8. Backup/restore does not lose uploaded files.

## Definition of Done

A phase is done only when:

1. Required feature works.
2. Relevant tests or manual checks passed.
3. Build/typecheck result is recorded.
4. `live-update.md` is updated.
5. Remaining issues are clearly listed.
