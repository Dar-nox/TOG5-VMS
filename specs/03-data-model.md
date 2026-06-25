# 03 — Data Model Specification

This file defines the initial domain entities and database tables for TOG 5 VMS.

Use this as a starting point. Exact SQL may evolve, but business meaning should remain stable.

## Table List

1. `users`
2. `vehicles`
3. `vehicle_photos`
4. `vehicle_documents`
5. `vehicle_features`
6. `fuel_logs`
7. `maintenance_templates`
8. `maintenance_template_rules`
9. `vehicle_maintenance_settings`
10. `maintenance_schedules`
11. `maintenance_logs`
12. `repair_records`
13. `parts_inventory`
14. `expenses`
15. `alerts`
16. `settings`
17. `backups`
18. `audit_logs`

## vehicles

Purpose: stores the main vehicle profile.

Fields:

| Field | Type | Required | Notes |
|---|---:|---:|---|
| id | text/uuid | yes | Primary key |
| vehicle_name | text | yes | Primary human identifier |
| primary_photo_id | text/uuid | yes | References vehicle_photos |
| plate_number | text | no | Optional |
| vehicle_type | text | yes | Sedan, van, truck, motorcycle, etc. |
| fuel_type | text | yes | Gasoline, diesel, hybrid, EV, etc. |
| transmission_type | text | no | Manual, automatic, CVT, DCT, etc. |
| drivetrain | text | no | FWD, RWD, AWD, 4WD, unknown |
| brand | text | no | Optional |
| model | text | no | Optional |
| year_model | integer | no | Optional |
| color | text | no | Optional |
| engine_description | text | no | Optional |
| current_odometer | integer/real | yes | Must not be negative |
| status | text | yes | Active, under maintenance, inactive, archived |
| assigned_driver | text | no | Optional |
| date_acquired | date | no | Optional |
| registration_expiry | date | no | Optional |
| insurance_expiry | date | no | Optional |
| notes | text | no | Optional |
| created_at | datetime | yes | Auto |
| updated_at | datetime | yes | Auto |
| archived_at | datetime | no | Nullable |

Rules:

- `plate_number` must be nullable.
- `vehicle_name` and `primary_photo_id` are required.
- Archived vehicles should not produce new alerts.

## vehicle_photos

Purpose: stores metadata for vehicle images.

Fields:

| Field | Type | Required | Notes |
|---|---:|---:|---|
| id | text/uuid | yes | Primary key |
| vehicle_id | text/uuid | no | Nullable during creation if needed |
| file_path | text | yes | Local path |
| original_filename | text | no | Optional |
| mime_type | text | no | Example: image/jpeg |
| file_size_bytes | integer | no | Optional |
| is_primary | boolean | yes | Default false |
| created_at | datetime | yes | Auto |

## vehicle_documents

Purpose: stores metadata for local vehicle-related documents.

Document types:

1. OR/CR.
2. Registration.
3. Insurance.
4. Fuel receipt.
5. Maintenance receipt.
6. Repair receipt.
7. Warranty.
8. Inspection report.
9. Other.

Fields:

| Field | Type | Required | Notes |
|---|---:|---:|---|
| id | text/uuid | yes | Primary key |
| vehicle_id | text/uuid | yes | References vehicles |
| document_type | text | yes | Type enum/string |
| file_path | text | yes | Local path |
| original_filename | text | no | Optional |
| description | text | no | Optional |
| related_record_type | text | no | fuel_log, maintenance_log, expense, etc. |
| related_record_id | text/uuid | no | Optional |
| created_at | datetime | yes | Auto |

## vehicle_features

Purpose: stores feature flags used by maintenance applicability rules.

Recommended feature keys:

1. `turbocharged`
2. `supercharged`
3. `diesel_particulate_filter`
4. `def_adblue`
5. `timing_belt`
6. `timing_chain`
7. `carbureted`
8. `fuel_injected`
9. `hybrid_system`
10. `electric_motor_system`

Fields:

| Field | Type | Required | Notes |
|---|---:|---:|---|
| id | text/uuid | yes | Primary key |
| vehicle_id | text/uuid | yes | References vehicles |
| feature_key | text | yes | Feature identifier |
| enabled | boolean | yes | Default false |
| notes | text | no | Optional |

## fuel_logs

Purpose: records fuel purchases and supports fuel efficiency calculations.

Fields:

| Field | Type | Required | Notes |
|---|---:|---:|---|
| id | text/uuid | yes | Primary key |
| vehicle_id | text/uuid | yes | References vehicles |
| fuel_date | datetime | yes | Purchase date/time |
| odometer | integer/real | yes | Current odometer |
| fuel_type | text | yes | Fuel bought |
| liters | real | yes | Must be greater than 0 |
| price_per_liter | real | no | Can be calculated from total |
| total_amount | real | yes | Must be >= 0 |
| station_name | text | no | Optional |
| receipt_number | text | no | Optional |
| receipt_document_id | text/uuid | no | References vehicle_documents |
| is_full_tank | boolean | yes | Required for accurate efficiency |
| efficiency_status | text | yes | official, estimated, incomplete, not_computed |
| computed_km_per_liter | real | no | Nullable |
| computed_l_per_100km | real | no | Nullable |
| computed_cost_per_km | real | no | Nullable |
| notes | text | no | Optional |
| created_at | datetime | yes | Auto |

## maintenance_templates

Purpose: master list of maintenance types.

Fields:

| Field | Type | Required | Notes |
|---|---:|---:|---|
| id | text/uuid | yes | Primary key |
| name | text | yes | Example: Engine Oil Change |
| category | text | yes | Oil, tires, brakes, etc. |
| description | text | no | Plain-language explanation |
| default_time_interval_days | integer | no | Nullable |
| default_odometer_interval_km | integer | no | Nullable |
| default_due_soon_days | integer | yes | Example: 14 |
| default_due_soon_km | integer | yes | Example: 500 |
| priority | text | yes | low, medium, high, critical |
| is_active | boolean | yes | Default true |
| created_at | datetime | yes | Auto |
| updated_at | datetime | yes | Auto |

## maintenance_template_rules

Purpose: determines when a template applies to a vehicle.

Fields:

| Field | Type | Required | Notes |
|---|---:|---:|---|
| id | text/uuid | yes | Primary key |
| template_id | text/uuid | yes | References maintenance_templates |
| applies_to_vehicle_type | text | no | Nullable means any |
| applies_to_fuel_type | text | no | Nullable means any |
| applies_to_transmission_type | text | no | Nullable means any |
| applies_to_drivetrain | text | no | Nullable means any |
| requires_feature | text | no | Feature key |
| excludes_feature | text | no | Feature key |
| rule_type | text | yes | include or exclude |
| notes | text | no | Optional |

## vehicle_maintenance_settings

Purpose: per-vehicle customization of maintenance templates.

Fields:

| Field | Type | Required | Notes |
|---|---:|---:|---|
| id | text/uuid | yes | Primary key |
| vehicle_id | text/uuid | yes | References vehicles |
| template_id | text/uuid | yes | References maintenance_templates |
| status | text | yes | active, disabled, not_applicable, manually_added |
| custom_time_interval_days | integer | no | Override |
| custom_odometer_interval_km | integer | no | Override |
| custom_due_soon_days | integer | no | Override |
| custom_due_soon_km | integer | no | Override |
| notes | text | no | Optional |

## maintenance_schedules

Purpose: live schedule showing next due maintenance.

Fields:

| Field | Type | Required | Notes |
|---|---:|---:|---|
| id | text/uuid | yes | Primary key |
| vehicle_id | text/uuid | yes | References vehicles |
| template_id | text/uuid | yes | References maintenance_templates |
| last_completed_date | date | no | Nullable |
| last_completed_odometer | integer/real | no | Nullable |
| next_due_date | date | no | Nullable |
| next_due_odometer | integer/real | no | Nullable |
| status | text | yes | upcoming, due_soon, overdue, etc. |
| priority | text | yes | low, medium, high, critical |
| estimated_cost | real | no | Optional |
| notes | text | no | Optional |
| updated_at | datetime | yes | Auto |

## maintenance_logs

Purpose: actual completed maintenance/service records.

Fields:

| Field | Type | Required | Notes |
|---|---:|---:|---|
| id | text/uuid | yes | Primary key |
| vehicle_id | text/uuid | yes | References vehicles |
| template_id | text/uuid | no | Nullable for custom work |
| completed_date | date | yes | Date completed |
| odometer | integer/real | yes | Odometer at service |
| work_performed | text | yes | Description |
| parts_replaced | text | no | Optional |
| labor_cost | real | no | Default 0 |
| parts_cost | real | no | Default 0 |
| total_cost | real | yes | Calculated or entered |
| mechanic_shop | text | no | Optional |
| receipt_document_id | text/uuid | no | Optional |
| before_photo_id | text/uuid | no | Optional |
| after_photo_id | text/uuid | no | Optional |
| warranty_expiration | date | no | Optional |
| next_recommended_date | date | no | Optional |
| next_recommended_odometer | integer/real | no | Optional |
| notes | text | no | Optional |
| created_at | datetime | yes | Auto |

## expenses

Purpose: records all vehicle-related expenses.

Fields:

| Field | Type | Required | Notes |
|---|---:|---:|---|
| id | text/uuid | yes | Primary key |
| vehicle_id | text/uuid | yes | References vehicles |
| expense_date | date | yes | Expense date |
| category | text | yes | Fuel, repairs, parts, etc. |
| description | text | yes | Human readable |
| amount | real | yes | Must be >= 0 |
| receipt_document_id | text/uuid | no | Optional |
| related_record_type | text | no | fuel_log, maintenance_log, etc. |
| related_record_id | text/uuid | no | Optional |
| notes | text | no | Optional |
| created_at | datetime | yes | Auto |

## alerts

Purpose: in-app and desktop alert records.

Fields:

| Field | Type | Required | Notes |
|---|---:|---:|---|
| id | text/uuid | yes | Primary key |
| vehicle_id | text/uuid | no | Nullable for system alerts |
| alert_type | text | yes | due_soon, overdue, etc. |
| priority | text | yes | low, medium, high, critical |
| title | text | yes | Short title |
| message | text | yes | User-friendly message |
| related_record_type | text | no | Optional |
| related_record_id | text/uuid | no | Optional |
| status | text | yes | active, dismissed, snoozed, resolved |
| due_date | datetime | no | Optional |
| snoozed_until | datetime | no | Optional |
| created_at | datetime | yes | Auto |
| resolved_at | datetime | no | Nullable |

## settings

Purpose: app settings.

Suggested keys:

1. `startup_on_boot_enabled`
2. `backup_reminder_enabled`
3. `backup_reminder_interval_days`
4. `default_due_soon_days`
5. `default_due_soon_km`
6. `currency_symbol`
7. `distance_unit`
8. `volume_unit`

## audit_logs

Purpose: optional but recommended for tracking important changes.

Fields:

| Field | Type | Required | Notes |
|---|---:|---:|---|
| id | text/uuid | yes | Primary key |
| user_id | text/uuid | no | Nullable |
| action | text | yes | create, update, delete, archive, restore |
| entity_type | text | yes | vehicle, fuel_log, etc. |
| entity_id | text/uuid | no | Optional |
| summary | text | yes | Human-readable |
| created_at | datetime | yes | Auto |
