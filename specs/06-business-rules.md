# 06 — Business Rules

## Vehicle Rules

1. Vehicle name is required.
2. Vehicle picture is required.
3. Plate number is optional.
4. Current odometer is required and must not be negative.
5. Odometer cannot decrease unless an admin confirms correction.
6. Archived vehicles should not generate new alerts.
7. Vehicle cards must prioritize photo and name over plate number.

## Fuel Logging Rules

1. Liters must be greater than 0.
2. Total amount must be zero or greater.
3. Fuel date cannot be absurdly far in the future.
4. Odometer must not be lower than the previous vehicle odometer unless admin override.
5. Fuel type mismatch should show a warning.
6. Official efficiency should only be calculated between full-tank logs.
7. Non-full-tank logs can be saved but should not produce official fuel efficiency.
8. DEF/AdBlue should not count as fuel consumption.
9. Fuel efficiency drop should trigger an alert if it exceeds configured threshold.

## Fuel Efficiency Rules

Formula:

```text
Distance traveled = current odometer - previous odometer
km/L = distance traveled / liters purchased
L/100km = (liters purchased / distance traveled) * 100
cost/km = total amount / distance traveled
```

Do not calculate if:

1. Previous odometer is missing.
2. Current odometer is lower than previous.
3. Liters is zero or missing.
4. Full-tank rule is not satisfied for official calculation.

## Maintenance Schedule Rules

1. Maintenance can be due by date, odometer, or whichever comes first.
2. Due soon defaults are 14 days or 500 km.
3. Due soon thresholds must be editable.
4. Overdue alerts remain active until completed, skipped, dismissed, or rescheduled.
5. Completing maintenance should calculate the next due date/odometer.
6. Completing maintenance should create or update related expense records.
7. Skipped maintenance should require a reason.
8. Disabled maintenance should not generate alerts.
9. Not-applicable maintenance should not generate alerts.

## Applicability Rules

1. Diesel vehicles must not automatically receive spark plug maintenance.
2. Gasoline vehicles must not automatically receive DEF/AdBlue tasks.
3. Full EVs must not automatically receive engine oil, spark plug, fuel filter, or exhaust maintenance.
4. Manual vehicles should receive clutch-related suggestions.
5. Automatic/CVT/DCT vehicles should receive their matching transmission-fluid tasks.
6. 4WD/AWD vehicles may receive transfer case maintenance if applicable.
7. Turbocharged vehicles may receive turbo/intercooler inspection tasks.
8. User override is allowed but must show a warning when the task seems mismatched.

## Alert Rules

Create alerts for:

1. Maintenance due soon.
2. Maintenance overdue.
3. Registration expiring soon.
4. Insurance expiring soon.
5. Fuel efficiency drop.
6. Missing receipt, if required by settings.
7. Abnormal odometer.
8. Backup reminder.
9. Maintenance applicability mismatch.

Alert statuses:

1. Active.
2. Snoozed.
3. Dismissed.
4. Resolved.

## Expense Rules

1. Fuel logs should create fuel expense records.
2. Maintenance logs should create maintenance/repair expense records.
3. Expense amount must be zero or greater.
4. Expense should be linked to a vehicle.
5. Receipt attachment is optional but should be encouraged.

## Document Rules

1. Documents are stored locally.
2. Database stores metadata and file path.
3. Missing files should be handled gracefully.
4. Deleting a record should not accidentally delete shared files unless confirmed.
5. Backups should include database and file storage.

## Backup Rules

1. Manual backup must be available.
2. Restore must warn the user before replacing current data.
3. Backup should include database and uploaded files.
4. Backup should be verifiable if possible.
5. App should remind the user if backup is overdue.

## User Access Rules

Roles:

1. Admin.
2. Staff/User.
3. Viewer.

Admin can:

1. Manage vehicles.
2. Manage maintenance templates.
3. Manage users.
4. Backup/restore.
5. Delete/archive records.
6. Override validation warnings.

Staff can:

1. Add fuel logs.
2. Add maintenance logs.
3. Upload receipts.
4. View assigned vehicles.

Viewer can:

1. View dashboard.
2. View reports.
3. View records.

Viewer cannot edit.
