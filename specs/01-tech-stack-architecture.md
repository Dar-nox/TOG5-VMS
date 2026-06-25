# 01 — Tech Stack and Architecture

## Recommended Stack

- Desktop framework: Tauri
- Frontend: React + TypeScript
- Styling: Tailwind CSS and/or shadcn/ui
- Backend/native layer: Rust through Tauri commands
- Database: SQLite
- Database access: SQLx or another SQLite-compatible layer
- Charts: Recharts or Chart.js
- Exports: CSV and PDF support
- Local file storage: app data directory
- Development environment: VS Code
- Version control: Git

## Architecture Style

Use a local-first layered architecture.

```text
UI Layer
  React components, forms, dashboard, tables, modals

Application Layer
  Validation, workflow coordination, view models

Domain Layer
  Vehicle rules, fuel efficiency, maintenance scheduling, alerts

Persistence Layer
  SQLite repositories, migrations, file metadata

Native/Desktop Layer
  Tauri commands, filesystem access, notifications, autostart
```

## Local-Only Rule

The app must not upload data externally. Do not add analytics, telemetry, cloud sync, or online login.

Acceptable local operations:

1. Read/write SQLite database.
2. Read/write local documents and images.
3. Generate local backups.
4. Show desktop notifications.
5. Start with the operating system.

## Suggested Folder Structure

```text
tog5-vms/
  src/
    app/
      routes/
      layout/
      providers/
    components/
      common/
      forms/
      dashboard/
      vehicles/
      fuel/
      maintenance/
      reports/
    domain/
      vehicles/
      fuel/
      maintenance/
      alerts/
      expenses/
    services/
      api/
      validation/
      formatting/
      files/
    types/
    utils/
  src-tauri/
    src/
      commands/
      db/
      files/
      notifications/
      backup/
    migrations/
  specs/
    *.md
  live-update.md
```

## Data Storage

Use SQLite as the main database.

Use local file storage for:

1. Vehicle photos.
2. Fuel receipts.
3. Repair receipts.
4. Maintenance receipts.
5. OR/CR documents.
6. Insurance documents.
7. Backups.

The database should store metadata and file paths, not large binary files unless there is a strong reason.

## Startup-on-Boot

The app must eventually support a setting that enables or disables startup-on-boot behavior.

Implementation should be wrapped behind an app setting:

- `startup_on_boot_enabled: boolean`

## Notifications

Use desktop notifications for urgent or due-soon alerts. Also show the same alerts in-app so the user can still see them if OS notifications are disabled.

## Error Handling

Errors should be friendly and actionable.

Bad example:

`Constraint violation: fuel_logs_vehicle_id_foreign_key`

Good example:

`Fuel log could not be saved because the selected vehicle no longer exists.`

## Offline-First Assumption

All features must continue working without internet connection.
