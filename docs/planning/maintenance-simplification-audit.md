# Maintenance Simplification Audit

## Purpose

This audit records what the Maintenance simplification touches so the app does not keep old, confusing workflow pieces around.

## Previous User-Facing Flow

- Maintenance page showed three concepts at once: schedules, applicability, and the default template library.
- Users had to click `Create / sync schedules` before they could complete maintenance.
- Applicability and template-library details exposed the smart template engine directly.
- Several pages referenced schedule syncing or smart template planning in user-facing copy.

## New User-Facing Flow

- Maintenance is now vehicle-centered and starts with `Log maintenance done`.
- Users can log maintenance with or without a future reminder.
- Per-vehicle reminders define whether next due date/odometer is calculated.
- Existing schedule records are preserved as editable reminders where possible.
- Templates remain internal as a maintenance item catalog and safety-rule foundation.

## Touched Areas

- `src/components/maintenance/MaintenanceTemplateModule.tsx`: replaced tabbed template/schedule workspace with simple log/reminder workflow.
- `src/services/api/maintenance.ts`: added typed wrappers for reminder settings and direct maintenance logging.
- `src-tauri/src/maintenance/scheduling.rs`: schedule generation now uses vehicle reminder settings instead of auto-applicable templates.
- `src-tauri/src/maintenance/service_history.rs`: direct maintenance logging saves service history and updates reminders when configured.
- `src-tauri/src/maintenance/models.rs`: added request/response types for reminders and log maintenance.
- `src-tauri/src/maintenance/commands.rs` and `src-tauri/src/lib.rs`: registered new Tauri commands.
- `src/components/alerts/AlertsModule.tsx`: updated empty-state copy away from schedule sync.
- `src/components/serviceHistory/ServiceHistoryModule.tsx`: updated copy to point users to log maintenance.
- `src/components/settings/SettingsModule.tsx`: due-soon defaults now describe new reminders.
- `src/components/dashboard/DashboardModule.tsx` and `src-tauri/src/dashboard/repository.rs`: dashboard copy now points to reminders.
- `src/types/navigation.ts`: Maintenance navigation description now matches the simpler workflow.

## Behavior Kept

- Maintenance templates remain seeded at startup.
- Applicability rules remain available internally for future suggestions and warnings.
- `maintenance_logs` remains the source for service history and reports.
- Maintenance receipt/photo storage remains unchanged.
- Active maintenance alerts still come from schedule due status.
- Reports and expenses continue aggregating maintenance costs from `maintenance_logs`.

## Behavior Retired From Normal UI

- Visible `Schedules / Applicability / Template Library` tabs.
- User-facing `Create / sync schedules` action.
- User-facing explanation that schedules come from the smart template engine.

## Data Safety Notes

- No migration was required because `vehicle_maintenance_settings` already supports per-vehicle intervals and due-soon thresholds.
- Existing schedules are backfilled into vehicle reminder settings when maintenance data is read.
- Removing a reminder disables/archives its linked schedule and resolves related active maintenance alerts; service history remains intact.
