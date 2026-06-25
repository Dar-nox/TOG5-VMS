# 02 — Functional Specification

## 1. Dashboard

The dashboard must show:

1. Total vehicles.
2. Active vehicles.
3. Vehicles under maintenance.
4. Overdue maintenance count.
5. Due-soon maintenance count.
6. Latest fuel efficiency readings.
7. Monthly fuel cost.
8. Monthly maintenance cost.
9. Registration/insurance reminders.
10. Backup reminder.

Vehicle cards should show:

1. Vehicle picture.
2. Vehicle name.
3. Optional plate number.
4. Fuel type.
5. Current odometer.
6. Next due maintenance.
7. Status indicator.

## 2. Vehicle Management

Required fields:

1. Vehicle name.
2. Vehicle picture.
3. Vehicle type.
4. Fuel type.
5. Current odometer.
6. Vehicle status.

Optional fields:

1. Plate number.
2. Brand/manufacturer.
3. Model.
4. Year model.
5. Color.
6. Engine type/displacement.
7. Transmission type.
8. Drivetrain.
9. Assigned driver/user.
10. Date acquired.
11. Registration expiration.
12. Insurance expiration.
13. Notes.

Important rule:

- Plate number must not be required.
- Vehicle name and photo are the primary identifiers.

## 3. Vehicle Setup Wizard

When adding a vehicle, guide the user through:

1. Upload vehicle picture.
2. Enter vehicle name.
3. Select vehicle type.
4. Select fuel type.
5. Select transmission type.
6. Select drivetrain.
7. Enter current odometer.
8. Select vehicle features.
9. Choose maintenance template level: Basic, Standard, Heavy-use, or Custom.
10. Review suggested maintenance tasks.
11. Save.

## 4. Fuel Logging

Fuel log fields:

1. Vehicle.
2. Date/time.
3. Odometer.
4. Fuel type.
5. Fuel station.
6. Liters purchased.
7. Price per liter.
8. Total amount.
9. Receipt number.
10. Receipt image.
11. Full tank checkbox.
12. Notes.

Fuel efficiency formula:

```text
Distance traveled = current odometer - previous odometer
Fuel efficiency = distance traveled / liters purchased
```

Official fuel efficiency should only be computed between full-tank logs. Otherwise mark the result as estimated, incomplete, or not computed.

Warnings:

1. Odometer lower than previous reading.
2. Fuel type mismatch.
3. Unusually high liters.
4. Unusually high cost.
5. Missing receipt.
6. Missing full-tank status.
7. Significant efficiency drop.

## 5. Maintenance Scheduling

Maintenance can be scheduled by:

1. Date interval.
2. Odometer interval.
3. Whichever comes first.

Statuses:

1. Upcoming.
2. Due soon.
3. Due today.
4. Overdue.
5. Completed.
6. Skipped.
7. Not applicable.
8. Disabled.

Default due-soon thresholds:

1. 14 days.
2. 500 km.

These must be editable.

## 6. Maintenance Completion Logs

When a task is completed, collect:

1. Vehicle.
2. Maintenance type.
3. Completion date.
4. Odometer.
5. Work performed.
6. Parts replaced.
7. Labor cost.
8. Parts cost.
9. Total cost.
10. Shop/mechanic.
11. Receipt attachment.
12. Before photo, optional.
13. After photo, optional.
14. Warranty expiration, optional.
15. Next recommended date.
16. Next recommended odometer.
17. Notes.

After completion, the system must:

1. Save the log.
2. Update odometer if newer.
3. Resolve related alerts.
4. Compute next due date/odometer.
5. Add expense entry.
6. Update dashboard.

## 7. Alerts

Alert types:

1. Due soon by date.
2. Due soon by odometer.
3. Overdue by date.
4. Overdue by odometer.
5. Fuel efficiency drop.
6. Missing receipt.
7. Abnormal odometer.
8. Expiring registration.
9. Expiring insurance.
10. Vehicle has not been logged recently.
11. Maintenance applicability warning.
12. Backup reminder.
13. Unusual expense amount.

Alert actions:

1. Open related vehicle.
2. Mark maintenance completed.
3. Snooze.
4. Dismiss.
5. Reschedule.
6. View history.

## 8. Expenses

Expense categories:

1. Fuel.
2. Preventive maintenance.
3. Repairs.
4. Parts.
5. Labor.
6. Registration.
7. Insurance.
8. Cleaning.
9. Tires.
10. Emergency expenses.
11. Other.

## 9. Reports

Report types:

1. Vehicle maintenance summary.
2. Fuel efficiency report.
3. Fuel expense report.
4. Monthly vehicle cost report.
5. Upcoming maintenance report.
6. Overdue maintenance report.
7. Service history report.
8. Parts usage report.
9. Annual vehicle summary.
10. Receipt/document report.
11. Vehicle comparison report.
12. Fuel efficiency drop report.

Exports:

1. PDF.
2. CSV.
3. Excel-compatible file.
4. Printable view.

## 10. Backup and Restore

Backup must include:

1. SQLite database.
2. Local photos.
3. Receipts.
4. Documents.
5. Settings.

Backup features:

1. Manual backup.
2. Scheduled backup.
3. Backup reminders.
4. Restore from backup.
5. Backup verification.
