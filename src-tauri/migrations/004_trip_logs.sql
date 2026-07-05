CREATE TABLE trips (
  id TEXT PRIMARY KEY,
  vehicle_id TEXT NOT NULL,
  departure_time TEXT NOT NULL,
  return_time TEXT,
  reason TEXT NOT NULL,
  departure_notes TEXT,
  return_notes TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'completed', 'cancelled')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
);

CREATE INDEX idx_trips_vehicle_time ON trips(vehicle_id, departure_time);
CREATE INDEX idx_trips_status ON trips(status);
CREATE INDEX idx_trips_departure_time ON trips(departure_time);

CREATE TABLE trip_drivers (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL,
  driver_name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT,
  FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
);

CREATE INDEX idx_trip_drivers_trip_id ON trip_drivers(trip_id);
CREATE INDEX idx_trip_drivers_name ON trip_drivers(driver_name);

CREATE TABLE trip_passengers (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL,
  passenger_name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT,
  FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
);

CREATE INDEX idx_trip_passengers_trip_id ON trip_passengers(trip_id);

CREATE TABLE trip_destinations (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL,
  destination_name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT,
  FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
);

CREATE INDEX idx_trip_destinations_trip_id ON trip_destinations(trip_id);
CREATE INDEX idx_trip_destinations_name ON trip_destinations(destination_name);
