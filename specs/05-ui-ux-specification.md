# 05 — UI/UX Specification

## UX Priority

TOG 5 VMS must be easy to use for people who are not highly technical.

Design principle:

> The system should guide users, not overwhelm them.

## Visual Identity

Use a clean, practical office/dashboard style.

Recommended UI qualities:

1. Large readable text.
2. Clear action buttons.
3. Vehicle photos prominently displayed.
4. Simple color-coded statuses.
5. Minimal mechanic jargon unless explained.
6. Consistent layout.
7. Responsive desktop layout.

## Navigation

Use a sidebar with these sections:

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

## Global Layout

Recommended structure:

```text
Top Bar
  App name, search, notifications, current user

Sidebar
  Main navigation

Content Area
  Current page

Status Area
  Optional footer for backup status/app version
```

## Dashboard UX

Dashboard should answer these questions quickly:

1. Which vehicles need attention?
2. What maintenance is overdue?
3. What maintenance is due soon?
4. Are fuel costs or fuel efficiency changing?
5. Are any legal documents expiring?
6. Has backup been done recently?

Use cards such as:

1. Overdue Maintenance.
2. Due Soon.
3. Fuel Efficiency Warnings.
4. Monthly Expenses.
5. Backup Status.

## Vehicle List UX

Vehicle list items/cards should show:

1. Vehicle photo.
2. Vehicle name.
3. Optional plate number.
4. Vehicle type.
5. Fuel type.
6. Status.
7. Next due maintenance.

The photo and name should be more visually prominent than plate number.

## Vehicle Profile UX

Use tabs:

1. Overview.
2. Fuel Logs.
3. Maintenance.
4. Service History.
5. Expenses.
6. Documents.
7. Notes.

Overview should show:

1. Large vehicle photo.
2. Vehicle name.
3. Status.
4. Current odometer.
5. Fuel type.
6. Next maintenance.
7. Recent alerts.

## Add Vehicle Wizard

Use a wizard instead of one long form.

Steps:

1. Upload vehicle picture.
2. Vehicle name and basic details.
3. Vehicle type/fuel/transmission/drivetrain.
4. Feature checkboxes.
5. Odometer.
6. Maintenance template selection.
7. Review suggested maintenance.
8. Save.

## Fuel Log Form UX

The form should be quick and clear.

Fields to show first:

1. Vehicle selector with picture.
2. Date/time.
3. Odometer.
4. Liters.
5. Total amount.
6. Full tank checkbox.
7. Receipt upload.

Advanced/optional fields can be collapsed:

1. Fuel station.
2. Receipt number.
3. Price per liter.
4. Notes.

## Maintenance UX

Maintenance pages should include:

1. Calendar/list toggle.
2. Due soon filter.
3. Overdue filter.
4. Vehicle filter.
5. Maintenance category filter.
6. Mark as completed action.
7. Snooze/reschedule action.

Each maintenance item should clearly show:

1. Vehicle photo/name.
2. Task name.
3. Due date.
4. Due odometer.
5. Remaining days/km.
6. Status.
7. Priority.

## Alert UX

Alert messages must be plain language.

Bad:

`maintenance_schedule status threshold exceeded`

Good:

`Oil Change is overdue for Toyota Hiace by 8 days.`

Alert actions:

1. View vehicle.
2. Complete maintenance.
3. Snooze.
4. Dismiss.

## Status Colors

Use consistent colors:

1. Green — OK.
2. Yellow — Due soon.
3. Red — Overdue/critical.
4. Blue — Informational.
5. Gray — Inactive/archived.

Do not rely on color alone. Also use labels/icons.

## Forms and Validation

Forms should:

1. Clearly mark required fields.
2. Avoid too many fields at once.
3. Use dropdowns for standard choices.
4. Use friendly validation messages.
5. Warn before destructive actions.
6. Prevent accidental navigation away from unsaved forms.

## Required Tooltips / Help Text

Provide short explanations for:

1. Odometer.
2. Fuel efficiency.
3. Full tank.
4. Tire rotation.
5. Brake pads.
6. Coolant.
7. Transmission fluid.
8. Differential oil.
9. Preventive maintenance.
10. Spark plug.
11. Glow plug.
12. DEF/AdBlue.
13. Diesel particulate filter.

## Accessibility Basics

1. Buttons must have readable labels.
2. Forms must have labels.
3. Text contrast should be sufficient.
4. Keyboard navigation should be reasonable.
5. Do not use tiny text for important warnings.

## Empty States

Every empty page should tell the user what to do next.

Example:

```text
No fuel logs yet.
Add your first fuel log to start tracking fuel efficiency.
[Add Fuel Log]
```
