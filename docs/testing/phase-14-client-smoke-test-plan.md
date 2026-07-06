# TOG 5 VMS Phase 14 Client Smoke Test Plan

This plan guides client/release smoke testing for the local-only Windows MVP. It is for stabilization and bug triage only; it should not introduce new business features.

## Build Under Test

- App version: `0.2.0`
- Release executable: `src-tauri/target/release/tog5-vms.exe`
- Installer artifact: `src-tauri/target/release/bundle/nsis/TOG 5 VMS_0.2.0_x64-setup.exe`
- Package type: Windows NSIS installer, current-user install mode

## Test Environment Assumptions

- Windows 10 or Windows 11 test machine.
- WebView2 Runtime installed.
- No developer server required.
- Release app should not use Vite or port `1420`.
- Test data is local to the Windows user profile.
- Installer is unsigned and may trigger Windows SmartScreen warnings.

## Pre-Test Backup Guidance

- Before testing restore, create a manual backup from Backup & Restore.
- Keep a copy of any important existing `.tog5backup` package outside the app-data folder.
- Do not test restore against important production-like data unless a safe backup exists.
- Do not delete app-data folders manually during normal client smoke testing.

## Manual App Launch Checks

- Launch `src-tauri/target/release/tog5-vms.exe`.
- Confirm the window title and app icon look like TOG 5 VMS.
- Confirm Dashboard opens without a dev server.
- Confirm no obvious debug/scaffold text remains.
- Confirm the app-data database exists under the local app-data path.
- Confirm no process is listening on port `1420` in release mode.

## Installer Checks

- Confirm the NSIS installer file exists.
- Run the installer on a safe test machine only.
- Confirm install completes without requiring administrator rights by default.
- Launch the app from Start Menu or shortcut if created.
- Confirm the installed app creates or uses local app-data.
- Confirm no user app-data, database, photos, receipts, backups, `node_modules`, or build folders were bundled into the installer.
- Record uninstall behavior, especially whether local app-data remains.

## Module Smoke Tests

### Dashboard

- Dashboard opens and overview cards load.
- Dashboard does not show duplicate quick actions; use the sidebar for primary navigation.
- Empty states are friendly when data is missing.
- Monthly costs and alerts roughly match Reports and Alerts.

### Vehicles

- Vehicles list opens.
- Add vehicle with required photo.
- Confirm plate number is optional.
- Confirm vehicle photo displays in the list and profile.
- Restart the app and confirm the photo still displays.
- Edit vehicle.
- Archive vehicle.

### Maintenance

- Maintenance opens with the simplified log-and-reminder workflow.
- Select an existing vehicle.
- Log maintenance without a reminder and confirm it appears in Service History.
- Add or update a vehicle reminder.
- Log maintenance with a reminder and confirm next due date/odometer updates when applicable.

### Service History

- Service History opens.
- Vehicle selector works.
- Completed maintenance appears in service history.
- Receipt/photo indicators work if attachments were added.

### Alerts

- Alerts page opens.
- Active alerts list loads.
- Dismissal works for an active alert.
- Completing related maintenance resolves maintenance alerts.

### Fuel Logs

- Fuel Logs opens.
- Add a partial-tank log and confirm it does not show official efficiency.
- Add first full-tank log and confirm it waits for another full-tank log.
- Add second full-tank log and confirm official km/L appears.
- Attach a fuel receipt.
- Confirm DEF/AdBlue is not counted as diesel fuel efficiency.
- Confirm fuel type mismatch warnings appear when expected.

### Expenses

- Expenses opens.
- Vehicle filter works.
- Add manual expense.
- Edit manual expense.
- Archive manual expense.

### Reports

- Reports opens.
- Reports reflect fuel, service, repairs, and manual expenses.
- Vehicle filter changes the report.
- Costs avoid obvious duplicate counting from linked source records.
- Currency display remains consistent with Settings.

### Backup & Restore

- Backup & Restore opens.
- Local file safety summary appears.
- Managed folder counts appear.
- Create backup works.
- Backup validation works.
- Restore is clearly confirmation-gated.
- Do not restore over important data unless a safety backup exists and the tester intends to validate restore behavior.

### Settings

- Settings opens.
- Default local owner user appears.
- Display name can be updated.
- General preferences can be saved.
- Maintenance/alert settings can be saved.
- Backup reminder settings appear.
- Reset to defaults works.
- Local data safety notes are clear and honest.

## Data Safety Checks

- Vehicle photos display after restart.
- Fuel receipts remain available after restart.
- Maintenance receipts/photos remain available after restart.
- Backups include database and managed file folders.
- Restore warns before replacing local app data.
- No app data is stored in the project repo during normal app use.

## Regression Checks

- Vehicles still open.
- Fuel Logs still open.
- Maintenance log/reminder workflow still opens.
- Service History still opens.
- Expenses still open.
- Reports still open.
- Backup & Restore still opens.
- Alerts still open.
- Settings still open.
- Dashboard remains clean without duplicate quick-action cards.

## Pass/Fail Checklist

|  ID | Check                                                      | Pass/Fail | Notes |
| --: | ---------------------------------------------------------- | --------- | ----- |
|   1 | Dashboard opens and overview cards load                    |           |       |
|   2 | Dashboard has no duplicate quick actions                   |           |       |
|   3 | Vehicles list opens                                        |           |       |
|   4 | Add vehicle with required photo                            |           |       |
|   5 | Vehicle photo displays after restart                       |           |       |
|   6 | Edit vehicle                                               |           |       |
|   7 | Archive vehicle                                            |           |       |
|   8 | Maintenance opens                                          |           |       |
|   9 | Add/update a maintenance reminder                          |           |       |
|  10 | Log maintenance and update next due values when applicable |           |       |
|  11 | Service History shows completed service                    |           |       |
|  12 | Alerts page opens and active alerts/dismissal work         |           |       |
|  13 | Fuel Logs opens                                            |           |       |
|  14 | Add partial tank                                           |           |       |
|  15 | Add full-tank logs and confirm official km/L behavior      |           |       |
|  16 | Attach a fuel receipt                                      |           |       |
|  17 | Expenses opens                                             |           |       |
|  18 | Add/edit/archive manual expense                            |           |       |
|  19 | Reports opens and reflects costs                           |           |       |
|  20 | Backup & Restore opens                                     |           |       |
|  21 | Create and validate backup                                 |           |       |
|  22 | Restore is clearly confirmation-gated                      |           |       |
|  23 | Settings opens                                             |           |       |
|  24 | Update/reset settings                                      |           |       |
|  25 | Currency display remains consistent                        |           |       |
|  26 | Release app launches without dev server/port 1420          |           |       |
|  27 | Installer launches                                         |           |       |
|  28 | Install completes on test machine                          |           |       |
|  29 | App launches from Start Menu/shortcut if installed         |           |       |
|  30 | Uninstall behavior is recorded                             |           |       |
|  31 | No user app-data is bundled into installer                 |           |       |
|  32 | Local photos/receipts still display in installed app       |           |       |
|  33 | No obvious debug/scaffold text remains                     |           |       |

## Bug Severity Definitions

- Blocker: Prevents app launch, installer use, data creation, or safe recovery from backup.
- High: Breaks a core MVP workflow such as vehicle creation, maintenance completion, fuel logging, expenses, reports, alerts, settings, or backup creation.
- Medium: Workflow still works but has confusing behavior, incorrect display, non-critical validation gaps, or recoverable errors.
- Low: Cosmetic issue, typo, minor layout problem, or documentation issue that does not block testing.

## Bug Report Template

```md
## Bug Title

- Severity:
- Environment:
- Build under test:
- Area:
- Steps to reproduce:
  1.
  2.
  3.
- Expected result:
- Actual result:
- Screenshots/logs:
- Suspected area:
- Fix status:
```

## Client Test Notes

- Record each confirmed issue in `docs/testing/phase-14-bug-triage-log.md`.
- Fix confirmed bugs narrowly.
- Retest the exact failing workflow after every fix.
- Do not add new features during this phase.
