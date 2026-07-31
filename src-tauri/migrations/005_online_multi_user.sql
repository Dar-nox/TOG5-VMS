ALTER TABLE users ADD COLUMN last_login_at TEXT;
ALTER TABLE users ADD COLUMN password_updated_at TEXT;

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_seen_at TEXT,
  user_agent TEXT,
  ip_address TEXT,
  revoked_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX idx_sessions_token_hash ON sessions(token_hash);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

ALTER TABLE vehicles ADD COLUMN created_by TEXT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE vehicles ADD COLUMN updated_by TEXT REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE vehicle_documents ADD COLUMN created_by TEXT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE vehicle_documents ADD COLUMN updated_by TEXT REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE fuel_logs ADD COLUMN created_by TEXT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE fuel_logs ADD COLUMN updated_by TEXT REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE trips ADD COLUMN created_by TEXT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE trips ADD COLUMN updated_by TEXT REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE maintenance_logs ADD COLUMN created_by TEXT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE maintenance_logs ADD COLUMN updated_by TEXT REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE repair_records ADD COLUMN created_by TEXT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE repair_records ADD COLUMN updated_by TEXT REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE expenses ADD COLUMN created_by TEXT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE expenses ADD COLUMN updated_by TEXT REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
