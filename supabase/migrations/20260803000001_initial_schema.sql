-- TOG 5 VMS — initial Postgres schema.
--
-- Ported from the four SQLite migrations that shipped with the desktop app.
-- The differences from those files are deliberate; each one is a decision the
-- move to Postgres forced, and they are listed here so nobody has to diff two
-- dialects to work out what changed.
--
--   * Primary keys are uuid. The old ids came from generate_local_id(), which
--     is a millisecond timestamp plus a process-local counter that resets on
--     restart — fine for one desktop app, collision-prone the moment several
--     clients write at once.
--   * Times are typed. SQLite stored everything as TEXT in three incompatible
--     shapes. Machine timestamps are timestamptz, user-entered days are date,
--     and user-entered moments are timestamptz.
--   * INTEGER 0/1 flags are boolean; REAL money is numeric.
--   * The ~18 enums that were only ever checked in Rust are CHECK constraints
--     now. Once clients reach the database directly, nothing else enforces them.
--   * users is gone. Supabase Auth owns identity; profiles holds the display
--     name and the role that RLS keys off.
--   * backups and parts_inventory are not carried across. Supabase manages
--     backups, and parts_inventory has no UI and no foreign keys — it was
--     never used.
--   * created_by / updated_by are new. Several people share this data now, and
--     adding attribution columns after the client has a year of history is far
--     more expensive than adding them today.
--
-- RLS is deliberately NOT enabled here — that is the next migration. Do not
-- deploy this one on its own.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- The desktop app set updated_at by hand in roughly forty UPDATE statements.
-- Clients talking to PostgREST directly will not, so it moves to a trigger.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- People
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  role text not null default 'manager'
    check (role in ('owner', 'manager', 'viewer')),
  status text not null default 'active'
    check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

comment on column public.profiles.role is
  'Only owner is enforced: owners may clear data, restore, reset settings, and manage accounts. manager and viewer are identical today and exist for future limits.';

-- ---------------------------------------------------------------------------
-- Vehicles
-- ---------------------------------------------------------------------------

-- vehicles and vehicle_photos reference each other. SQLite resolved that
-- lazily; Postgres will not, so the back-reference is added after both tables
-- exist and is deferrable so a client can insert a photo and a vehicle in one
-- transaction.
create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  vehicle_name text not null,
  primary_photo_id uuid,
  plate_number text,
  vehicle_type text not null
    check (vehicle_type in ('sedan', 'suv', 'van', 'truck', 'bus', 'motorcycle', 'other')),
  fuel_type text not null
    check (fuel_type in ('gasoline', 'diesel', 'hybrid_gasoline', 'hybrid_diesel', 'full_ev', 'other')),
  transmission_type text
    check (transmission_type is null or transmission_type in ('manual', 'automatic', 'cvt', 'dct', 'none', 'unknown')),
  drivetrain text
    check (drivetrain is null or drivetrain in ('fwd', 'rwd', 'awd', '4wd', 'none', 'unknown')),
  brand text,
  model text,
  year_model integer,
  color text,
  engine_description text,
  current_odometer numeric(12, 2) not null default 0 check (current_odometer >= 0),
  status text not null default 'active'
    check (status in ('active', 'under_maintenance', 'inactive', 'sold_disposed', 'archived')),
  assigned_driver text,
  date_acquired date,
  registration_expiry date,
  insurance_expiry date,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  deleted_at timestamptz
);

create table public.vehicle_photos (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid references public.vehicles(id) on delete set null,
  -- A Supabase Storage object key, not a filesystem path. The desktop app
  -- stored absolute Windows paths, which are meaningless to any other device.
  storage_path text not null,
  original_filename text,
  mime_type text,
  file_size_bytes bigint,
  is_primary boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table public.vehicles
  add constraint vehicles_primary_photo_id_fkey
  foreign key (primary_photo_id) references public.vehicle_photos(id)
  on delete set null
  deferrable initially deferred;

create table public.vehicle_documents (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  document_type text not null,
  storage_path text not null,
  original_filename text,
  description text,
  related_record_type text,
  related_record_id uuid,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

comment on column public.vehicle_documents.document_type is
  'Open-ended on purpose: fuel_receipt and maintenance_receipt today, with OR/CR and insurance documents planned.';

create table public.vehicle_features (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  feature_key text not null,
  enabled boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (vehicle_id, feature_key)
);

-- ---------------------------------------------------------------------------
-- Fuel
-- ---------------------------------------------------------------------------

create table public.fuel_logs (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  -- A moment the driver picked at the pump, not a machine timestamp.
  fuel_date timestamptz not null,
  odometer numeric(12, 2) not null check (odometer >= 0),
  fuel_type text not null
    check (fuel_type in ('gasoline', 'diesel', 'hybrid_gasoline', 'hybrid_diesel', 'full_ev', 'def_adblue', 'other')),
  liters numeric(10, 3) not null check (liters > 0),
  price_per_liter numeric(12, 2) check (price_per_liter is null or price_per_liter >= 0),
  total_amount numeric(12, 2) not null check (total_amount >= 0),
  station_name text,
  receipt_number text,
  receipt_document_id uuid references public.vehicle_documents(id) on delete set null,
  is_full_tank boolean not null default false,
  efficiency_status text not null default 'not_computed'
    check (efficiency_status in ('official', 'not_computed')),
  computed_km_per_liter numeric(12, 4),
  computed_l_per_100km numeric(12, 4),
  computed_cost_per_km numeric(12, 4),
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- ---------------------------------------------------------------------------
-- Maintenance templates and rules
-- ---------------------------------------------------------------------------

create table public.maintenance_templates (
  id uuid primary key default gen_random_uuid(),
  -- Stable key for the seeded defaults. Null for items the user created, which
  -- is how seeding tells "mine to update" from "the user's, leave alone".
  template_key text,
  name text not null,
  category text not null,
  description text,
  default_time_interval_days integer,
  default_odometer_interval_km integer,
  default_due_soon_days integer not null default 14,
  default_due_soon_km integer not null default 500,
  priority text not null default 'medium'
    check (priority in ('low', 'medium', 'high', 'critical')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.maintenance_template_rules (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.maintenance_templates(id) on delete cascade,
  -- Rules are evaluated in order, and the first one that matches supplies the
  -- explanation shown to the user. SQLite got that order for free because the
  -- ids were generated as name__01, name__02 and the query sorted by id.
  -- Random uuids lose it, so the order is explicit here.
  sort_order integer not null default 0,
  -- Every dimension is nullable, and null means "any". A rule with all six
  -- null therefore matches every vehicle.
  applies_to_vehicle_type text,
  applies_to_fuel_type text,
  applies_to_transmission_type text,
  applies_to_drivetrain text,
  requires_feature text,
  excludes_feature text,
  rule_type text not null default 'include'
    check (rule_type in ('include', 'exclude')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Per-vehicle maintenance settings and schedules
-- ---------------------------------------------------------------------------

create table public.vehicle_maintenance_settings (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  template_id uuid not null references public.maintenance_templates(id) on delete cascade,
  -- The client's data only uses active and disabled, but the app can produce
  -- all four, so all four are allowed.
  status text not null default 'active'
    check (status in ('active', 'manually_added', 'disabled', 'not_applicable')),
  custom_time_interval_days integer,
  custom_odometer_interval_km integer,
  custom_due_soon_days integer,
  custom_due_soon_km integer,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (vehicle_id, template_id)
);

create table public.maintenance_schedules (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  template_id uuid not null references public.maintenance_templates(id) on delete cascade,
  vehicle_maintenance_setting_id uuid
    references public.vehicle_maintenance_settings(id) on delete set null,
  last_completed_date date,
  last_completed_odometer numeric(12, 2)
    check (last_completed_odometer is null or last_completed_odometer >= 0),
  next_due_date date,
  next_due_odometer numeric(12, 2)
    check (next_due_odometer is null or next_due_odometer >= 0),
  due_soon_days integer not null default 14,
  due_soon_km integer not null default 500,
  -- 'upcoming' is the value a row is born with, before it has been evaluated.
  status text not null default 'upcoming'
    check (status in ('upcoming', 'not_due', 'due_soon', 'due_today', 'overdue', 'needs_setup', 'disabled')),
  priority text not null default 'medium'
    check (priority in ('low', 'medium', 'high', 'critical')),
  estimated_cost numeric(12, 2) check (estimated_cost is null or estimated_cost >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  deleted_at timestamptz
);

-- ---------------------------------------------------------------------------
-- Work done
-- ---------------------------------------------------------------------------

create table public.maintenance_logs (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  template_id uuid references public.maintenance_templates(id) on delete set null,
  schedule_id uuid references public.maintenance_schedules(id) on delete set null,
  completed_date date not null,
  odometer numeric(12, 2) not null check (odometer >= 0),
  work_performed text not null,
  parts_replaced text,
  labor_cost numeric(12, 2) not null default 0 check (labor_cost >= 0),
  parts_cost numeric(12, 2) not null default 0 check (parts_cost >= 0),
  total_cost numeric(12, 2) not null check (total_cost >= 0),
  mechanic_shop text,
  receipt_document_id uuid references public.vehicle_documents(id) on delete set null,
  before_photo_id uuid references public.vehicle_photos(id) on delete set null,
  after_photo_id uuid references public.vehicle_photos(id) on delete set null,
  warranty_expiration date,
  next_recommended_date date,
  next_recommended_odometer numeric(12, 2)
    check (next_recommended_odometer is null or next_recommended_odometer >= 0),
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.repair_records (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  repair_date date not null,
  odometer numeric(12, 2) check (odometer is null or odometer >= 0),
  issue_description text not null,
  work_performed text,
  parts_replaced text,
  labor_cost numeric(12, 2) not null default 0 check (labor_cost >= 0),
  parts_cost numeric(12, 2) not null default 0 check (parts_cost >= 0),
  total_cost numeric(12, 2) not null default 0 check (total_cost >= 0),
  mechanic_shop text,
  receipt_document_id uuid references public.vehicle_documents(id) on delete set null,
  warranty_expiration date,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- ---------------------------------------------------------------------------
-- Money
-- ---------------------------------------------------------------------------

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid references public.vehicles(id) on delete set null,
  expense_date date not null,
  -- Free text, slugified by the app. Deliberately unconstrained: the client
  -- invents their own categories.
  category text not null,
  description text not null,
  amount numeric(12, 2) not null check (amount >= 0),
  receipt_document_id uuid references public.vehicle_documents(id) on delete set null,
  -- When set, this expense mirrors a cost already recorded elsewhere, and the
  -- reports must not count it twice.
  related_record_type text
    check (related_record_type is null or related_record_type in ('fuel_log', 'maintenance_log', 'repair_record', 'other')),
  related_record_id uuid,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- ---------------------------------------------------------------------------
-- Alerts
-- ---------------------------------------------------------------------------

create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid references public.vehicles(id) on delete cascade,
  maintenance_schedule_id uuid references public.maintenance_schedules(id) on delete cascade,
  alert_type text not null,
  priority text not null default 'medium'
    check (priority in ('low', 'medium', 'high', 'critical')),
  title text not null,
  message text not null,
  related_record_type text,
  related_record_id uuid,
  -- A dismissed alert is never re-raised for the same schedule and type. That
  -- is the rule the whole alert refresh hangs on.
  status text not null default 'active'
    check (status in ('active', 'dismissed', 'resolved')),
  due_date date,
  snoozed_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz,
  deleted_at timestamptz
);

-- ---------------------------------------------------------------------------
-- Trips
-- ---------------------------------------------------------------------------

create table public.trips (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  departure_time timestamptz not null,
  return_time timestamptz,
  reason text not null,
  departure_notes text,
  return_notes text,
  status text not null default 'open'
    check (status in ('open', 'completed', 'cancelled')),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint trips_return_after_departure
    check (return_time is null or return_time >= departure_time)
);

create table public.trip_drivers (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  driver_name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.trip_passengers (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  passenger_name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.trip_destinations (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  destination_name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- ---------------------------------------------------------------------------
-- Settings and history
-- ---------------------------------------------------------------------------

create table public.settings (
  key text primary key,
  value text not null,
  value_type text not null default 'string'
    check (value_type in ('string', 'integer', 'boolean')),
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  summary text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

comment on table public.audit_logs is
  'Append-only. No updated_at and no deleted_at, by design.';

-- ---------------------------------------------------------------------------
-- Indexes
--
-- Everything the SQLite schema had, plus the foreign keys it left unindexed.
-- Postgres does not index FK children automatically, and every cascade on an
-- unindexed child is a sequential scan of that child.
-- ---------------------------------------------------------------------------

create index idx_vehicles_status on public.vehicles(status);
create index idx_vehicles_fuel_type on public.vehicles(fuel_type);
create index idx_vehicles_plate_number on public.vehicles(plate_number);
create index idx_vehicles_primary_photo_id on public.vehicles(primary_photo_id);

create index idx_vehicle_photos_vehicle_id on public.vehicle_photos(vehicle_id);

create index idx_vehicle_documents_vehicle_id on public.vehicle_documents(vehicle_id);
create index idx_vehicle_documents_related_record
  on public.vehicle_documents(related_record_type, related_record_id);

create index idx_vehicle_features_vehicle_id on public.vehicle_features(vehicle_id);
create index idx_vehicle_features_feature_key on public.vehicle_features(feature_key);

create index idx_fuel_logs_vehicle_date on public.fuel_logs(vehicle_id, fuel_date);
create index idx_fuel_logs_receipt_document_id on public.fuel_logs(receipt_document_id);

create index idx_maintenance_templates_category on public.maintenance_templates(category);
create index idx_maintenance_templates_active on public.maintenance_templates(is_active);
create unique index idx_maintenance_templates_template_key
  on public.maintenance_templates(template_key)
  where template_key is not null;

create index idx_template_rules_template_id
  on public.maintenance_template_rules(template_id, sort_order);
create index idx_template_rules_applicability
  on public.maintenance_template_rules(
    applies_to_vehicle_type,
    applies_to_fuel_type,
    applies_to_transmission_type,
    applies_to_drivetrain
  );

create index idx_vehicle_maintenance_settings_vehicle_id
  on public.vehicle_maintenance_settings(vehicle_id);
create index idx_vehicle_maintenance_settings_template_id
  on public.vehicle_maintenance_settings(template_id);

create index idx_maintenance_schedules_vehicle_id on public.maintenance_schedules(vehicle_id);
create index idx_maintenance_schedules_template_id on public.maintenance_schedules(template_id);
create index idx_maintenance_schedules_setting_id
  on public.maintenance_schedules(vehicle_maintenance_setting_id);
create index idx_maintenance_schedules_status on public.maintenance_schedules(status);
create index idx_maintenance_schedules_next_due_date on public.maintenance_schedules(next_due_date);
-- One live schedule per vehicle and template. Survives soft delete.
create unique index idx_maintenance_schedules_vehicle_template_live
  on public.maintenance_schedules(vehicle_id, template_id)
  where deleted_at is null;

create index idx_maintenance_logs_vehicle_date
  on public.maintenance_logs(vehicle_id, completed_date);
create index idx_maintenance_logs_template_id on public.maintenance_logs(template_id);
create index idx_maintenance_logs_schedule_id on public.maintenance_logs(schedule_id);
create index idx_maintenance_logs_receipt_document_id
  on public.maintenance_logs(receipt_document_id);
create index idx_maintenance_logs_before_photo_id on public.maintenance_logs(before_photo_id);
create index idx_maintenance_logs_after_photo_id on public.maintenance_logs(after_photo_id);

create index idx_repair_records_vehicle_date on public.repair_records(vehicle_id, repair_date);
create index idx_repair_records_receipt_document_id
  on public.repair_records(receipt_document_id);

create index idx_expenses_vehicle_date on public.expenses(vehicle_id, expense_date);
create index idx_expenses_related_record
  on public.expenses(related_record_type, related_record_id);
create index idx_expenses_receipt_document_id on public.expenses(receipt_document_id);

create index idx_alerts_status_priority on public.alerts(status, priority);
create index idx_alerts_vehicle_id on public.alerts(vehicle_id);
create index idx_alerts_schedule_id on public.alerts(maintenance_schedule_id);
-- Stops the alert refresh raising the same alert twice.
create unique index idx_alerts_active_schedule_type
  on public.alerts(vehicle_id, maintenance_schedule_id, alert_type)
  where status = 'active'
    and deleted_at is null
    and maintenance_schedule_id is not null;

create index idx_trips_vehicle_time on public.trips(vehicle_id, departure_time);
create index idx_trips_status on public.trips(status);
create index idx_trips_departure_time on public.trips(departure_time);
-- One open trip per vehicle, enforced here rather than by a read-then-write.
create unique index idx_trips_one_open_per_vehicle
  on public.trips(vehicle_id)
  where status = 'open' and deleted_at is null;

create index idx_trip_drivers_trip_id on public.trip_drivers(trip_id);
create index idx_trip_drivers_name on public.trip_drivers(driver_name);
create index idx_trip_passengers_trip_id on public.trip_passengers(trip_id);
create index idx_trip_passengers_name on public.trip_passengers(passenger_name);
create index idx_trip_destinations_trip_id on public.trip_destinations(trip_id);
create index idx_trip_destinations_name on public.trip_destinations(destination_name);

create index idx_audit_logs_entity on public.audit_logs(entity_type, entity_id);
create index idx_audit_logs_user_id on public.audit_logs(user_id);
create index idx_audit_logs_created_at on public.audit_logs(created_at desc);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------

create trigger set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.vehicles
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.vehicle_documents
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.vehicle_features
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.fuel_logs
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.maintenance_templates
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.maintenance_template_rules
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.vehicle_maintenance_settings
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.maintenance_schedules
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.maintenance_logs
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.repair_records
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.expenses
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.alerts
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.trips
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.settings
  for each row execute function public.set_updated_at();
