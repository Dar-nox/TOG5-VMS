# TOG 5 VMS User Manual

- Version: 0.4.0
- Audience: TOG 5 VMS operators and administrators
- Platform: Windows desktop, plus any phone, tablet, or laptop with a browser

## 1. What TOG 5 VMS Is

TOG 5 VMS is a Vehicle Maintenance System for the TOG 5 fleet. It helps record vehicles, trips, fuel logs, maintenance work, service history, expenses, alerts, reports, backups, and settings.

From version 0.4.0 the app runs on one computer in the office, and everybody else reaches it over the internet with their own account. Several people can work in it at the same time, and every change records who made it.

The records themselves never leave the company. They stay on the office computer, on a system the company owns. There is no third-party cloud service holding the data, no telemetry, no GPS tracking, and no OCR.

## 2. Important Data Safety Notes

- All data lives on the office computer that runs TOG 5 VMS, in a SQLite database and app-managed folders.
- Vehicle photos, fuel receipts, and maintenance receipts/photos are copied to that computer. The original file you picked is not needed afterwards.
- Everybody signs in. There is no shared password and no default password.
- Backups are `.tog5backup` folder packages, and one is made automatically every night.
- The database file itself is not encrypted, so keep the office computer and its backups physically secure.
- The connection between your device and the app is encrypted, so it is safe to use over mobile data.
- If the office computer is switched off, nobody can use the app. It is the one thing that has to stay on.

## 3. First-Time Setup

The first person to open a brand-new TOG 5 VMS is asked to choose the owner password. This happens once and cannot be repeated.

1. Open the app address in a browser.
2. Choose a password of at least 10 characters, and write it down somewhere safe.
3. Confirm it.

**There is no way to recover a lost owner password.** The only way back in is restoring a backup from before it was changed. Store it the way you would store a safe combination.

You are signed in straight afterwards. Then:

1. Open `Settings` and add an account for each person who needs one.
2. Confirm preferred currency, distance unit, and alert preferences.
3. Open `Backup & Restore` and create a first backup once real data is entered.

## 3a. Signing In Every Day

Enter your username and password. The app remembers you on that device for 30 days unless you sign out.

Sign out with the `Sign out` button at the bottom of the side menu. Do that on any device other people can pick up.

After ten wrong passwords in five minutes the app stops accepting attempts from that device for a while. It clears on its own.

## 3b. Putting TOG 5 VMS on Your Device

Once installed, the app opens like any other app, with no address bar and no tabs.

**Android phone or tablet.** Open the address in Chrome. It offers to install the app; accept, and the icon appears on your home screen.

**iPhone or iPad.** Open the address in Safari, tap the Share button, then `Add to Home Screen`. Safari does not offer this by itself, so it is easy to miss.

**Windows desktop.** Install the TOG 5 VMS desktop app from whoever set the system up. It opens straight into the app.

**Any computer.** You can also simply open the address in a browser and use it there.

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
5. The file downloads to your device, and the app confirms the name it used.

Open it with any spreadsheet program. The file is on the device you are using, not on the office computer.

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

Only the owner account can restore a backup.

Restore always creates a safety backup of the current data first, so a restore can itself be undone.

The restore does not happen the instant you confirm it. TOG 5 VMS prepares it, then restarts itself and applies it while starting up, because replacing the data underneath people who are using it would damage it. In practice everybody is briefly disconnected, and five to ten seconds later the app comes back on the restored data. Tell people before you do it.

If the computer loses power in the middle, nothing is lost. The prepared restore is still there and is applied the next time the computer starts.

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

This is where accounts are managed.

**Adding somebody.** Only the owner can do this. Give them a display name, a username, and a starting password of at least 10 characters. Usernames ignore capital letters, so `Maria` and `maria` are the same person and the second one is refused.

**Changing a password.** Only the owner can do this. Changing somebody's password signs them out of every device they were using, which is exactly what you want if a phone goes missing.

**What each account can do.** Everybody can do all the day-to-day work: vehicles, trips, fuel, maintenance, expenses, reports, and backups. Only the owner can clear all data, restore a backup, reset settings, or manage accounts. There is nothing to configure; the app already works this way.

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

### Backup & Data Safety

Settings shows the database path, the data folder path, the backup format, and the encryption status. Those paths are on the office computer, not on the device you are reading them from.

### Startup Preference

The preference is stored here, but what actually starts TOG 5 VMS with the office computer is the Windows service installed on that machine.

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

### Does the app upload data to somebody else's cloud?

No. The data stays on the office computer, which the company owns. The app is reachable over the internet so staff can use it from anywhere, but nothing is stored on a third-party service.

### Can two people work in it at the same time?

Yes, that is the point of this version. Each person signs in with their own account, and the app records who added or changed each record.

### Does it work without internet?

No. The app needs a connection to the office computer, so a driver with no signal cannot record a trip until they are back in range. Offline use is not part of this version.

### What happens if the office computer is switched off?

Nobody can use the app until it is back on. It should be set never to sleep, and left running.

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

Wherever your device normally puts downloads. The CSV is created on your own device, so you can open it straight away in a spreadsheet.

## 19. Known Limitations

- No offline use. Everything needs a connection to the office computer.
- The office computer is a single point of failure. If it fails, the app is down until it is repaired or the data is restored somewhere else. This is why the nightly backup matters.
- No database encryption. Keep the office computer and its backups physically secure.
- A lost owner password cannot be recovered.
- No OCR.
- No GPS tracking.
- No push notifications. Alerts appear in the app.
- No automatic manufacturer maintenance lookup.
- Roles exist but there is no screen for them. Everybody can do the day-to-day work; only the owner can do the destructive things.

## 20. Support Handoff Checklist

Before handing the app to a client, confirm:

1. The owner password is set, staff accounts exist, and the app opens from a phone **on mobile data rather than office wifi**.
1. Dashboard opens.
1. Vehicles opens and vehicle photos display.
1. Fuel Logs opens and a fuel log can be saved.
1. Trips opens and trip start/end works.
1. Maintenance opens and maintenance can be logged.
1. Service History shows completed maintenance.
1. Expenses opens and a manual expense can be saved.
1. Reports opens, exports CSV, and prints.
1. Alerts opens and refresh works.
1. Backup & Restore creates a backup.
1. Settings opens and preferences save.
1. A second person can sign in on another device and see the same records.
1. The nightly backup task has been run once by hand and produced a package.
1. The office computer has been restarted, and both the app and its internet address came back on their own.
1. A backup has been created before handoff.
