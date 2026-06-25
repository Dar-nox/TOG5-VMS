CREATE TABLE users (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  username TEXT,
  role TEXT NOT NULL DEFAULT 'admin',
  password_hash TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT
);

CREATE UNIQUE INDEX idx_users_username_unique
  ON users(username)
  WHERE username IS NOT NULL;

CREATE TABLE vehicles (
  id TEXT PRIMARY KEY,
  vehicle_name TEXT NOT NULL,
  primary_photo_id TEXT,
  plate_number TEXT,
  vehicle_type TEXT NOT NULL,
  fuel_type TEXT NOT NULL,
  transmission_type TEXT,
  drivetrain TEXT,
  brand TEXT,
  model TEXT,
  year_model INTEGER,
  color TEXT,
  engine_description TEXT,
  current_odometer REAL NOT NULL DEFAULT 0 CHECK (current_odometer >= 0),
  status TEXT NOT NULL DEFAULT 'active',
  assigned_driver TEXT,
  date_acquired TEXT,
  registration_expiry TEXT,
  insurance_expiry TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  archived_at TEXT,
  deleted_at TEXT,
  FOREIGN KEY (primary_photo_id) REFERENCES vehicle_photos(id) ON DELETE SET NULL
);

CREATE INDEX idx_vehicles_status ON vehicles(status);
CREATE INDEX idx_vehicles_fuel_type ON vehicles(fuel_type);
CREATE INDEX idx_vehicles_plate_number ON vehicles(plate_number);

CREATE TABLE vehicle_photos (
  id TEXT PRIMARY KEY,
  vehicle_id TEXT,
  file_path TEXT NOT NULL,
  original_filename TEXT,
  mime_type TEXT,
  file_size_bytes INTEGER,
  is_primary INTEGER NOT NULL DEFAULT 0 CHECK (is_primary IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL
);

CREATE INDEX idx_vehicle_photos_vehicle_id ON vehicle_photos(vehicle_id);

CREATE TABLE vehicle_documents (
  id TEXT PRIMARY KEY,
  vehicle_id TEXT NOT NULL,
  document_type TEXT NOT NULL,
  file_path TEXT NOT NULL,
  original_filename TEXT,
  description TEXT,
  related_record_type TEXT,
  related_record_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
);

CREATE INDEX idx_vehicle_documents_vehicle_id ON vehicle_documents(vehicle_id);
CREATE INDEX idx_vehicle_documents_related_record
  ON vehicle_documents(related_record_type, related_record_id);

CREATE TABLE vehicle_features (
  id TEXT PRIMARY KEY,
  vehicle_id TEXT NOT NULL,
  feature_key TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0, 1)),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE,
  UNIQUE (vehicle_id, feature_key)
);

CREATE INDEX idx_vehicle_features_vehicle_id ON vehicle_features(vehicle_id);
CREATE INDEX idx_vehicle_features_feature_key ON vehicle_features(feature_key);

CREATE TABLE fuel_logs (
  id TEXT PRIMARY KEY,
  vehicle_id TEXT NOT NULL,
  fuel_date TEXT NOT NULL,
  odometer REAL NOT NULL CHECK (odometer >= 0),
  fuel_type TEXT NOT NULL,
  liters REAL NOT NULL CHECK (liters > 0),
  price_per_liter REAL CHECK (price_per_liter IS NULL OR price_per_liter >= 0),
  total_amount REAL NOT NULL CHECK (total_amount >= 0),
  station_name TEXT,
  receipt_number TEXT,
  receipt_document_id TEXT,
  is_full_tank INTEGER NOT NULL DEFAULT 0 CHECK (is_full_tank IN (0, 1)),
  efficiency_status TEXT NOT NULL DEFAULT 'not_computed',
  computed_km_per_liter REAL,
  computed_l_per_100km REAL,
  computed_cost_per_km REAL,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE,
  FOREIGN KEY (receipt_document_id) REFERENCES vehicle_documents(id) ON DELETE SET NULL
);

CREATE INDEX idx_fuel_logs_vehicle_date ON fuel_logs(vehicle_id, fuel_date);
CREATE INDEX idx_fuel_logs_receipt_document_id ON fuel_logs(receipt_document_id);

CREATE TABLE maintenance_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  default_time_interval_days INTEGER,
  default_odometer_interval_km INTEGER,
  default_due_soon_days INTEGER NOT NULL DEFAULT 14,
  default_due_soon_km INTEGER NOT NULL DEFAULT 500,
  priority TEXT NOT NULL DEFAULT 'medium',
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT
);

CREATE INDEX idx_maintenance_templates_category ON maintenance_templates(category);
CREATE INDEX idx_maintenance_templates_active ON maintenance_templates(is_active);

CREATE TABLE maintenance_template_rules (
  id TEXT PRIMARY KEY,
  template_id TEXT NOT NULL,
  applies_to_vehicle_type TEXT,
  applies_to_fuel_type TEXT,
  applies_to_transmission_type TEXT,
  applies_to_drivetrain TEXT,
  requires_feature TEXT,
  excludes_feature TEXT,
  rule_type TEXT NOT NULL DEFAULT 'include',
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (template_id) REFERENCES maintenance_templates(id) ON DELETE CASCADE
);

CREATE INDEX idx_template_rules_template_id ON maintenance_template_rules(template_id);
CREATE INDEX idx_template_rules_applicability
  ON maintenance_template_rules(
    applies_to_vehicle_type,
    applies_to_fuel_type,
    applies_to_transmission_type,
    applies_to_drivetrain
  );

CREATE TABLE vehicle_maintenance_settings (
  id TEXT PRIMARY KEY,
  vehicle_id TEXT NOT NULL,
  template_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  custom_time_interval_days INTEGER,
  custom_odometer_interval_km INTEGER,
  custom_due_soon_days INTEGER,
  custom_due_soon_km INTEGER,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE,
  FOREIGN KEY (template_id) REFERENCES maintenance_templates(id) ON DELETE CASCADE,
  UNIQUE (vehicle_id, template_id)
);

CREATE INDEX idx_vehicle_maintenance_settings_vehicle_id
  ON vehicle_maintenance_settings(vehicle_id);

CREATE TABLE maintenance_schedules (
  id TEXT PRIMARY KEY,
  vehicle_id TEXT NOT NULL,
  template_id TEXT NOT NULL,
  vehicle_maintenance_setting_id TEXT,
  last_completed_date TEXT,
  last_completed_odometer REAL CHECK (
    last_completed_odometer IS NULL OR last_completed_odometer >= 0
  ),
  next_due_date TEXT,
  next_due_odometer REAL CHECK (next_due_odometer IS NULL OR next_due_odometer >= 0),
  due_soon_days INTEGER NOT NULL DEFAULT 14,
  due_soon_km INTEGER NOT NULL DEFAULT 500,
  status TEXT NOT NULL DEFAULT 'upcoming',
  priority TEXT NOT NULL DEFAULT 'medium',
  estimated_cost REAL CHECK (estimated_cost IS NULL OR estimated_cost >= 0),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  archived_at TEXT,
  deleted_at TEXT,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE,
  FOREIGN KEY (template_id) REFERENCES maintenance_templates(id) ON DELETE CASCADE,
  FOREIGN KEY (vehicle_maintenance_setting_id)
    REFERENCES vehicle_maintenance_settings(id)
    ON DELETE SET NULL
);

CREATE INDEX idx_maintenance_schedules_vehicle_id ON maintenance_schedules(vehicle_id);
CREATE INDEX idx_maintenance_schedules_status ON maintenance_schedules(status);
CREATE INDEX idx_maintenance_schedules_next_due_date ON maintenance_schedules(next_due_date);

CREATE TABLE maintenance_logs (
  id TEXT PRIMARY KEY,
  vehicle_id TEXT NOT NULL,
  template_id TEXT,
  schedule_id TEXT,
  completed_date TEXT NOT NULL,
  odometer REAL NOT NULL CHECK (odometer >= 0),
  work_performed TEXT NOT NULL,
  parts_replaced TEXT,
  labor_cost REAL NOT NULL DEFAULT 0 CHECK (labor_cost >= 0),
  parts_cost REAL NOT NULL DEFAULT 0 CHECK (parts_cost >= 0),
  total_cost REAL NOT NULL CHECK (total_cost >= 0),
  mechanic_shop TEXT,
  receipt_document_id TEXT,
  before_photo_id TEXT,
  after_photo_id TEXT,
  warranty_expiration TEXT,
  next_recommended_date TEXT,
  next_recommended_odometer REAL CHECK (
    next_recommended_odometer IS NULL OR next_recommended_odometer >= 0
  ),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE,
  FOREIGN KEY (template_id) REFERENCES maintenance_templates(id) ON DELETE SET NULL,
  FOREIGN KEY (schedule_id) REFERENCES maintenance_schedules(id) ON DELETE SET NULL,
  FOREIGN KEY (receipt_document_id) REFERENCES vehicle_documents(id) ON DELETE SET NULL,
  FOREIGN KEY (before_photo_id) REFERENCES vehicle_photos(id) ON DELETE SET NULL,
  FOREIGN KEY (after_photo_id) REFERENCES vehicle_photos(id) ON DELETE SET NULL
);

CREATE INDEX idx_maintenance_logs_vehicle_date ON maintenance_logs(vehicle_id, completed_date);
CREATE INDEX idx_maintenance_logs_template_id ON maintenance_logs(template_id);

CREATE TABLE repair_records (
  id TEXT PRIMARY KEY,
  vehicle_id TEXT NOT NULL,
  repair_date TEXT NOT NULL,
  odometer REAL CHECK (odometer IS NULL OR odometer >= 0),
  issue_description TEXT NOT NULL,
  work_performed TEXT,
  parts_replaced TEXT,
  labor_cost REAL NOT NULL DEFAULT 0 CHECK (labor_cost >= 0),
  parts_cost REAL NOT NULL DEFAULT 0 CHECK (parts_cost >= 0),
  total_cost REAL NOT NULL DEFAULT 0 CHECK (total_cost >= 0),
  mechanic_shop TEXT,
  receipt_document_id TEXT,
  warranty_expiration TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE,
  FOREIGN KEY (receipt_document_id) REFERENCES vehicle_documents(id) ON DELETE SET NULL
);

CREATE INDEX idx_repair_records_vehicle_date ON repair_records(vehicle_id, repair_date);

CREATE TABLE parts_inventory (
  id TEXT PRIMARY KEY,
  part_name TEXT NOT NULL,
  part_number TEXT,
  category TEXT,
  quantity_on_hand REAL NOT NULL DEFAULT 0 CHECK (quantity_on_hand >= 0),
  unit TEXT,
  reorder_level REAL CHECK (reorder_level IS NULL OR reorder_level >= 0),
  unit_cost REAL CHECK (unit_cost IS NULL OR unit_cost >= 0),
  supplier TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  archived_at TEXT,
  deleted_at TEXT
);

CREATE INDEX idx_parts_inventory_part_name ON parts_inventory(part_name);
CREATE INDEX idx_parts_inventory_category ON parts_inventory(category);

CREATE TABLE expenses (
  id TEXT PRIMARY KEY,
  vehicle_id TEXT,
  expense_date TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  amount REAL NOT NULL CHECK (amount >= 0),
  receipt_document_id TEXT,
  related_record_type TEXT,
  related_record_id TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL,
  FOREIGN KEY (receipt_document_id) REFERENCES vehicle_documents(id) ON DELETE SET NULL
);

CREATE INDEX idx_expenses_vehicle_date ON expenses(vehicle_id, expense_date);
CREATE INDEX idx_expenses_related_record ON expenses(related_record_type, related_record_id);

CREATE TABLE alerts (
  id TEXT PRIMARY KEY,
  vehicle_id TEXT,
  maintenance_schedule_id TEXT,
  alert_type TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  related_record_type TEXT,
  related_record_id TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  due_date TEXT,
  snoozed_until TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  resolved_at TEXT,
  deleted_at TEXT,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE,
  FOREIGN KEY (maintenance_schedule_id) REFERENCES maintenance_schedules(id) ON DELETE CASCADE
);

CREATE INDEX idx_alerts_status_priority ON alerts(status, priority);
CREATE INDEX idx_alerts_vehicle_id ON alerts(vehicle_id);
CREATE INDEX idx_alerts_schedule_id ON alerts(maintenance_schedule_id);

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  value_type TEXT NOT NULL DEFAULT 'string',
  description TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE backups (
  id TEXT PRIMARY KEY,
  backup_path TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  verified_at TEXT,
  size_bytes INTEGER,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_backups_status ON backups(status);
CREATE INDEX idx_backups_started_at ON backups(started_at);

CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  summary TEXT NOT NULL,
  metadata_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
