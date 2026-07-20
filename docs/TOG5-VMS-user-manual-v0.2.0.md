# TOG 5 VMS User Manual

Version: 0.2.0  
Audience: TOG 5 VMS operators and administrators  
Platform: Windows desktop

## 1. What TOG 5 VMS Is

TOG 5 VMS is a local desktop Vehicle Maintenance System. It helps record vehicles, trips, fuel logs, maintenance work, service history, expenses, alerts, reports, backups, and basic settings.

The app is local-only. Records are stored on the computer where the app is installed. There is no cloud sync, online account, remote upload, telemetry, GPS tracking, or OCR.

## 2. Important Data Safety Notes

- The app stores data locally in a SQLite database under the Windows app-data folder.
- Vehicle photos, fuel receipts, and maintenance receipts/photos are copied into app-managed local folders.
- The original selected file is not required after the app saves its own local copy.
- Backups are local `.tog5backup` folder packages.
- Database encryption is not enabled in this build.
- Create backups regularly, especially before clearing data, restoring data, uninstalling, or moving to another computer.

## 3. First-Time Setup

1. Install and open TOG 5 VMS.
2. Open `Settings`.
3. Check the default local owner profile.
4. Set the display name if needed.
5. Confirm preferred currency, distance unit, and alert preferences.
6. Open `Backup & Restore` and create an initial backup once setup data is entered.

## 4. Navigation Overview

The side menu is the main navigation.

- `Dashboard`: overall local summary.
- `Vehicles`: add and manage vehicles.
- `Fuel Logs`: record fuel purchases and fuel efficiency.
- `Trips`: record vehicle time out, drivers, passengers, destinations, and returns.
- `Maintenance`: log completed maintenance and manage maintenance items/reminders.
- `Service History`: view completed maintenance records.
- `Expenses`: record manual expenses not already saved elsewhere.
- `Reports`: view, print, and export maintenance/cost and trip reports.
- `Alerts`: view and refresh active in-app alerts.
- `Backup & Restore`: create backups, validate backups, restore backups, and check file safety.
- `Settings`: manage profile, preferences, alerts, backups, local data safety, and data clearing.

## 5. Dashboard

The Dashboard gives a quick local overview.

It shows:

- Vehicle count.
- Active alert count.
- Fuel efficiency summary when enough official fuel data exists.
- Monthly cost summary.
- Backup status.
- Needs-attention items.
- Recent activity.
- Monthly cost mix.

If a metric says there is not enough data yet, add more related records first. For example, official fuel efficiency requires full-tank fuel logs.

## 6. Vehicles

Use `Vehicles` to create and maintain vehicle records.

### Add a Vehicle

1. Open `Vehicles`.
2. Click `Add vehicle`.
3. Add a vehicle picture.
4. Enter `Vehicle name`.
5. Optionally enter plate number.
6. Choose vehicle type, fuel type, transmission, drivetrain, odometer, and status.
7. Save the vehicle.

Important rules:

- Vehicle name is required.
- Vehicle picture is required.
- Plate number is optional.
- Vehicle photos are copied into the app-managed local folder.

### Edit a Vehicle

1. Select a vehicle.
2. Click `Edit vehicle`.
3. Update details.
4. Save changes.

### Archive a Vehicle

1. Select a vehicle.
2. Click `Archive vehicle`.
3. Confirm the inline warning.

Archived vehicles are hidden from the normal vehicle list. They are not hard-deleted.

### Maintenance Reminders on Vehicle Profile

The vehicle profile shows maintenance reminders that have been configured for that vehicle. It can show next due date, next due odometer, status, and reason when available.

## 7. Fuel Logs

Use `Fuel Logs` to record fuel purchases and calculate official fuel efficiency.

### Add a Fuel Log

1. Open `Fuel Logs`.
2. Select a vehicle.
3. Fill in date/time, odometer, fuel type, liters, price per liter, and/or total amount.
4. Mark whether it was a full tank.
5. Optionally enter station name, receipt number, notes, and receipt attachment.
6. Save the fuel log.

### Automatic Amount Calculation

If liters and price per liter are entered, the app can calculate total amount. If total amount and liters are entered, the app can calculate price per liter when safe.

### Official Fuel Efficiency

Official km/L is calculated only when:

- The current log is a full tank.
- There is a previous full-tank log for the same vehicle.
- The current odometer is higher than the previous full-tank odometer.
- Liters are valid.
- The fuel type is not DEF/AdBlue.

Partial-tank logs are saved but are not official efficiency records.

### DEF/AdBlue

DEF/AdBlue may be saved as a fluid entry if used, but it is not counted as diesel fuel consumption and does not calculate official diesel fuel efficiency.

### Fuel Receipts

Fuel receipts are copied into an app-managed local folder. Receipt indicators are shown in the fuel history.

## 8. Trips

Use `Trips` to record operational vehicle trips. Trips are independent of fuel and maintenance calculations.

### Start a Trip

1. Open `Trips`.
2. Choose the vehicle.
3. Enter time out.
4. Enter reason for trip.
5. Add one or more drivers.
6. Add passengers if any.
7. Add one or more destinations.
8. Add departure notes if needed.
9. Save/start the trip.

The app prevents starting a duplicate open trip for the same vehicle.

### End a Trip

1. In `Currently out`, find the trip.
2. Click `End trip`.
3. Enter time returned.
4. Add return notes if needed.
5. Save.

Return time cannot be earlier than the departure time.

### Archive a Trip

1. Find the trip.
2. Click `Archive`.
3. Confirm the inline warning.

Archived trips are hidden from the normal trip history.

## 9. Maintenance

Use `Maintenance` to log work when it is done and to manage maintenance items for each vehicle.

The app no longer requires users to understand template syncing. The main workflow is simple:

1. Choose a vehicle.
2. Log maintenance work that was completed.
3. Optionally set days/km intervals for items that should be tracked for next due reminders.

### Log Maintenance Work

1. Open `Maintenance`.
2. Select a vehicle.
3. Choose or create a maintenance item.
4. Enter completed date.
5. Enter odometer if known.
6. Enter work performed, parts replaced, labor cost, parts cost, provider/shop, warranty date, and notes if needed.
7. Optionally attach receipt, before photo, and after photo.
8. Save the maintenance log.

### Cost Calculation

Labor cost and parts cost are added to form the total cost when safe.

### Maintenance Items and Reminders

Maintenance items are controlled by the user.

For each item, you can set:

- Item name.
- Priority.
- Every how many days.
- Every how many km.
- Warn days before.
- Warn km before.
- Description.

If an item has days or km intervals for the selected vehicle, the app can calculate the next due date or next due odometer after maintenance is logged.

If no interval is set, the maintenance log is still saved, but no next due reminder is calculated.

### Needs Attention

The Maintenance page shows due-soon, due-today, overdue, or setup-needed items for the selected vehicle when reminders exist.

## 10. Service History

Use `Service History` to view completed maintenance records.

Service History is read-only in this build. To add new maintenance records, use the `Maintenance` page.

Service records may show:

- Completed date.
- Odometer.
- Maintenance item.
- Work performed.
- Parts replaced.
- Labor cost.
- Parts cost.
- Total cost.
- Service provider.
- Warranty information.
- Receipt and photo indicators.

Service history also feeds Reports and Dashboard activity.

## 11. Expenses

Use `Expenses` for costs that are not already saved as fuel logs or completed maintenance.

Examples:

- Parking.
- Tolls.
- Registration fees.
- Insurance.
- Cleaning.
- Other manual costs.

### Add a Manual Expense

1. Open `Expenses`.
2. Choose a vehicle if the expense belongs to one.
3. Enter expense date.
4. Choose a category or use custom category.
5. Enter amount.
6. Enter description and notes.
7. Save.

Fuel and maintenance costs are already included in reports from their source records. Avoid adding the same fuel or maintenance cost again as a manual expense unless it is clearly a separate cost.

### Custom Categories

The category field supports common categories and a custom category option. Saved custom categories can be used in filters later.

## 12. Reports

Use `Reports` to view, print, and export local summaries.

There are two report tabs:

- `Maintenance`: cost, maintenance, fuel, expense, and vehicle cost summaries.
- `Trips`: trip counts, currently-out trips, trips by vehicle, trips by driver, destinations, and recent trips.

### Filters

Reports can be filtered by:

- Vehicle.
- Start date.
- End date.

### Export CSV

1. Open `Reports`.
2. Choose `Maintenance` or `Trips`.
3. Apply filters if needed.
4. Click `Export maintenance CSV` or `Export trips CSV`.
5. The app saves the file in the local app-data `report-exports` folder.
6. A success message shows the file path.
7. Click `Show file` to reveal the CSV in File Explorer.

Repeated exports do not overwrite earlier files. The app adds `-2`, `-3`, and so on when needed.

### Print

1. Open `Reports`.
2. Choose the report tab.
3. Apply filters if needed.
4. Click `Print maintenance` or `Print trips`.
5. Use the Windows print dialog.

## 13. Alerts

Use `Alerts` to view active in-app alerts.

Alerts may include:

- Maintenance due soon.
- Maintenance overdue.
- Fuel efficiency drop warnings.
- Backup reminders.

Click `Refresh alerts` if you recently changed records and want to update alert status.

Alerts are local in-app records only. There are no native Windows notifications in this build.

## 14. Backup & Restore

Use `Backup & Restore` to protect local data.

### What a Backup Includes

Backups include:

- SQLite database snapshot.
- Vehicle photos.
- Fuel receipts.
- Maintenance receipts.
- Maintenance photos.
- Manifest and checksums.

Backups do not depend on original user-selected file paths.

### Create Backup

1. Open `Backup & Restore`.
2. Click `Create backup`.
3. Wait for the success message.
4. Note the backup path.

### Moving a Backup to Another Computer

A backup is a **folder** whose name ends in `.tog5backup`. It is not a single file.

Inside that folder are a `manifest.json` file, a `database` folder, and a `files` folder. All of them are needed together.

1. On the computer you backed up from, find the folder ending in `.tog5backup`.
2. Copy that **whole folder**, not the files inside it.
3. Move it to the other computer with a USB drive, or compress the folder to a `.zip`, transfer it, and extract it on the other computer.
4. On the other computer, select the `.tog5backup` folder itself in `Backup & Restore`.

Common mistakes that stop a restore:

- Copying only the `tog5-vms.sqlite3` database file from inside the backup. That single file is not a usable backup on its own.
- Selecting a `.zip` file without extracting it first.
- Copying from a cloud storage folder before all files have finished downloading. Files that are still online-only copy across empty.

### Validate Backup

1. Select a backup package.
2. Click validate.
3. Confirm the app reports that the backup is valid before restoring.

If validation reports a problem, the app lists each problem with a short code such as `database_file_selected`. Read the message, which explains what to do. Use `Copy diagnostic report` to copy the full details if you need to send them for support.

### Restore Backup

1. Select a backup package.
2. Validate it.
3. Read the warning.
4. Confirm restore only when you are sure.

Restore creates a pre-restore safety backup before replacing current app data. A restart may be required after restore.

## 15. Settings

Use `Settings` to manage local preferences and data safety options.

Sections include:

- Profile & Access.
- General Preferences.
- Maintenance & Alerts.
- Backup & Local Data Safety.
- Startup & App Behavior.
- Clear Local Product Data.

### Profile & Access

The app creates a default local owner user. This is local scaffolding only. There is no cloud login and no enforced login screen in this build.

### General Preferences

You can set:

- Display name.
- Preferred currency.
- Distance unit.
- Fuel efficiency unit.
- Date display preference.

### Maintenance & Alerts

You can set default due-soon thresholds and alert preferences.

Existing reminders keep their stored thresholds unless edited.

### Backup & Local Data Safety

Settings shows:

- Database path.
- App data folder path.
- Backup package format.
- Encryption status.

### Startup Preference

Startup preference is stored locally, but actual Windows startup registration is future packaging/startup work.

### Clear Local Product Data

Use this only when removing test records from the device.

This clears product data such as:

- Vehicles.
- Trip logs.
- Fuel logs.
- Maintenance records.
- Reminders.
- Expenses.
- Alerts.
- App-managed photos/receipts.

It keeps:

- Settings.
- Local user profile.
- Maintenance item suggestions.
- Backup packages.

You must check the confirmation box before clearing data.

## 16. Recommended Daily Workflow

1. Add or update vehicle records in `Vehicles`.
2. Use `Trips` when a vehicle leaves and returns.
3. Use `Fuel Logs` after refueling.
4. Use `Maintenance` when work is completed.
5. Check `Dashboard` and `Alerts` for items needing attention.
6. Use `Expenses` for extra costs not already recorded elsewhere.
7. Use `Reports` for summaries, printing, and CSV export.
8. Create backups regularly in `Backup & Restore`.

## 17. Recommended Backup Routine

- Create a backup before major data cleanup.
- Create a backup before restoring an older backup.
- Create a backup before uninstalling or reinstalling.
- Create a backup before handing the computer to another user.
- Keep backup copies in a safe local or external drive location.

## 18. Common Questions

### Does the app upload data online?

No. TOG 5 VMS is local-only.

### Is the database encrypted?

No. Database encryption is not enabled in this build.

### Can I use the app without plate numbers?

Yes. Plate number is optional.

### Why does fuel efficiency not always show?

Official efficiency requires full-tank logs and enough odometer history.

### Why did a maintenance log not create a next due reminder?

The maintenance item must have a days interval or km interval set for the selected vehicle. Logs without intervals are saved but do not calculate next due.

### Should fuel or service costs be entered again in Expenses?

Usually no. Reports already include saved fuel logs and completed maintenance costs. Use Expenses for other/manual costs.

### Where are exported reports saved?

Reports are saved in the app-data `report-exports` folder. After export, use `Show file` to reveal the CSV in File Explorer.

## 19. Known Limitations

- No cloud sync.
- No online accounts.
- No remote database.
- No OCR.
- No GPS tracking.
- No native Windows notifications.
- No database encryption.
- No automatic manufacturer maintenance lookup.
- Startup-on-boot setting is stored but not OS-registered yet.

## 20. Support Handoff Checklist

Before handing the app to a client, confirm:

1. Dashboard opens.
2. Vehicles opens and vehicle photos display.
3. Fuel Logs opens and a fuel log can be saved.
4. Trips opens and trip start/end works.
5. Maintenance opens and maintenance can be logged.
6. Service History shows completed maintenance.
7. Expenses opens and a manual expense can be saved.
8. Reports opens, exports CSV, and prints.
9. Alerts opens and refresh works.
10. Backup & Restore creates a backup.
11. Settings opens and preferences save.
12. A backup has been created before handoff.
