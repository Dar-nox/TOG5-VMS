#!/usr/bin/env python3
"""Turn a TOG 5 VMS desktop backup into SQL that loads it into Postgres.

    python supabase/migrate_from_backup.py <backup-dir> --owner <profile-uuid> > load.sql

Writes SQL rather than loading directly, on purpose: it can be rehearsed
against a throwaway database, diffed, and read before anything touches the real
project.

Three things the desktop file needs translating out of:

*   **Ids.** `vehicle_1784465585674_3` is a millisecond timestamp plus a counter
    that resets when the app restarts. Fine for one machine; several phones
    writing at once would collide. Every id becomes a UUID, derived from the
    old one so re-running produces the same answer and the mapping stays
    checkable.

*   **Dates, in three formats.** `2026-07-19 12:53:05` was written by the
    machine in UTC. `2026-07-22T19:29` was typed by a person, in their own
    time, with no seconds — read as Manila time, because reading it as UTC
    would move every trip eight hours and quietly shift what counts as overdue.
    `2026-07-17` is a plain date and stays one.

*   **File paths.** `C:\\Users\\tog5m\\AppData\\...\\photo_1784465548523_2.jpg`
    means nothing to a phone. Only the filename survives, as an object in the
    matching bucket.

What is deliberately left behind: the local backup history, the app's own
migration log, and the password hash of the single desktop account. What is
deliberately carried: dismissed alerts, because a dismissed alert permanently
suppresses that reminder and the client silenced those two on purpose.
"""

from __future__ import annotations

import argparse
import os
import re
import sqlite3
import sys
import uuid
from datetime import datetime, timedelta, timezone

# The fleet is in the Philippines, which does not observe daylight saving, so a
# fixed offset is exactly right rather than an approximation.
LOCAL_TZ = timezone(timedelta(hours=8))

# Stable across runs: the same desktop id always becomes the same UUID, so a
# rehearsal and the real thing produce identical output and can be diffed.
ID_NAMESPACE = uuid.UUID("6f1d4f6e-2b4a-5c3d-9e8f-70a1b2c3d4e5")

BUCKET_FOR_FOLDER = {
    "vehicle-photos": "vehicle-photos",
    "fuel-receipts": "fuel-receipts",
    "maintenance-receipts": "maintenance-receipts",
    "maintenance-photos": "maintenance-photos",
}

# Their user triggers are silenced for the load. Foreign keys are not: those
# are enforced by system triggers, which `disable trigger user` leaves alone,
# so a broken reference still fails loudly rather than landing quietly.
TRIGGER_TABLES = [
    "vehicles", "fuel_logs", "vehicle_documents", "maintenance_schedules",
    "vehicle_maintenance_settings", "maintenance_logs", "maintenance_templates",
    "trips", "alerts", "expenses", "repair_records",
]

DOCUMENT_BUCKET = {
    "fuel_receipt": "fuel-receipts",
    "maintenance_receipt": "maintenance-receipts",
}


def new_id(old: str | None) -> str | None:
    return str(uuid.uuid5(ID_NAMESPACE, old)) if old else None


def sql_literal(value) -> str:
    if value is None:
        return "null"
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, (int, float)):
        return repr(value)
    return "'" + str(value).replace("'", "''") + "'"


def as_timestamp(value: str | None) -> str | None:
    """Every shape of date the desktop wrote, as an ISO instant."""
    if not value:
        return None

    text = str(value).strip()
    if not text:
        return None

    # 2026-07-22T19:29 — typed by a person, in their own time.
    match = re.fullmatch(r"(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?", text)
    if match:
        date, hour, minute, second = match.groups()
        moment = datetime.fromisoformat("%s %s:%s:%s" % (date, hour, minute, second or "00"))
        return moment.replace(tzinfo=LOCAL_TZ).isoformat()

    # 2026-07-19 12:53:05 — written by the machine, in UTC.
    match = re.fullmatch(r"(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2})", text)
    if match:
        moment = datetime.fromisoformat("%s %s" % match.groups())
        return moment.replace(tzinfo=timezone.utc).isoformat()

    # 2026-07-17 — a plain date. Midday local, so that reading it back in any
    # nearby timezone still lands on the day somebody meant.
    match = re.fullmatch(r"\d{4}-\d{2}-\d{2}", text)
    if match:
        return datetime.fromisoformat(text + " 12:00:00").replace(tzinfo=LOCAL_TZ).isoformat()

    raise ValueError("unrecognised date: %r" % value)


def as_date(value: str | None) -> str | None:
    """A calendar day, with any time part discarded rather than rounded."""
    if not value:
        return None

    text = str(value).strip()
    if not text:
        return None

    match = re.match(r"(\d{4}-\d{2}-\d{2})", text)
    if not match:
        raise ValueError("unrecognised date: %r" % value)

    return match.group(1)


def as_bool(value) -> bool:
    return bool(value)


def storage_path(file_path: str | None, fallback_bucket: str | None = None) -> str | None:
    """A Windows path becomes bucket plus filename, and nothing else."""
    if not file_path:
        return None

    parts = re.split(r"[\\/]+", str(file_path))
    filename = parts[-1]
    bucket = None

    for part in parts[:-1]:
        if part in BUCKET_FOR_FOLDER:
            bucket = BUCKET_FOR_FOLDER[part]

    bucket = bucket or fallback_bucket
    return "%s/%s" % (bucket, filename) if bucket else None


class Loader:
    def __init__(self, connection: sqlite3.Connection, owner: str, out):
        self.db = connection
        self.owner = owner
        self.out = out
        self.counts: dict[str, int] = {}
        self.files: list[tuple[str, str]] = []

    def write(self, text: str = "") -> None:
        print(text, file=self.out)

    def rows(self, table: str, order: str = "created_at"):
        try:
            return self.db.execute("select * from [%s] order by [%s]" % (table, order)).fetchall()
        except sqlite3.OperationalError:
            return self.db.execute("select * from [%s]" % table).fetchall()

    def insert(self, table: str, values: dict) -> None:
        columns = ", ".join(values)
        literals = ", ".join(sql_literal(v) for v in values.values())
        self.write("insert into public.%s (%s) values (%s);" % (table, columns, literals))
        self.counts[table] = self.counts.get(table, 0) + 1

    # -- the tables, in dependency order ------------------------------------

    def load_vehicles(self):
        for row in self.rows("vehicles"):
            self.insert("vehicles", {
                "id": new_id(row["id"]),
                "vehicle_name": row["vehicle_name"],
                "plate_number": row["plate_number"],
                "vehicle_type": row["vehicle_type"],
                "fuel_type": row["fuel_type"],
                "transmission_type": row["transmission_type"],
                "drivetrain": row["drivetrain"],
                "brand": row["brand"],
                "model": row["model"],
                "year_model": row["year_model"],
                "color": row["color"],
                "engine_description": row["engine_description"],
                "current_odometer": row["current_odometer"],
                "status": row["status"],
                "assigned_driver": row["assigned_driver"],
                "date_acquired": as_date(row["date_acquired"]),
                "registration_expiry": as_date(row["registration_expiry"]),
                "insurance_expiry": as_date(row["insurance_expiry"]),
                "notes": row["notes"],
                "created_by": self.owner,
                "updated_by": self.owner,
                "created_at": as_timestamp(row["created_at"]),
                "updated_at": as_timestamp(row["updated_at"]),
                "archived_at": as_timestamp(row["archived_at"]),
                "deleted_at": as_timestamp(row["deleted_at"]),
            })

    def load_photos(self):
        for row in self.rows("vehicle_photos"):
            path = storage_path(row["file_path"], "vehicle-photos")
            if path:
                self.files.append((row["file_path"], path))

            self.insert("vehicle_photos", {
                "id": new_id(row["id"]),
                "vehicle_id": new_id(row["vehicle_id"]),
                "storage_path": path,
                "original_filename": row["original_filename"],
                "mime_type": row["mime_type"],
                "file_size_bytes": row["file_size_bytes"],
                "is_primary": as_bool(row["is_primary"]),
                "created_by": self.owner,
                "created_at": as_timestamp(row["created_at"]),
                "deleted_at": as_timestamp(row["deleted_at"]),
            })

        # Held back until the photos exist, since this is the reference that
        # made the two tables circular in the first place.
        for row in self.rows("vehicles"):
            if row["primary_photo_id"]:
                self.write(
                    "update public.vehicles set primary_photo_id = %s where id = %s;"
                    % (sql_literal(new_id(row["primary_photo_id"])), sql_literal(new_id(row["id"])))
                )

    def load_documents(self):
        for row in self.rows("vehicle_documents"):
            path = storage_path(row["file_path"], DOCUMENT_BUCKET.get(row["document_type"]))
            if path:
                self.files.append((row["file_path"], path))

            self.insert("vehicle_documents", {
                "id": new_id(row["id"]),
                "vehicle_id": new_id(row["vehicle_id"]),
                "document_type": row["document_type"],
                "storage_path": path,
                "original_filename": row["original_filename"],
                "description": row["description"],
                "related_record_type": row["related_record_type"],
                "related_record_id": new_id(row["related_record_id"]),
                "created_by": self.owner,
                "updated_by": self.owner,
                "created_at": as_timestamp(row["created_at"]),
                "updated_at": as_timestamp(row["created_at"]),
                "deleted_at": as_timestamp(row["deleted_at"]),
            })

    def load_templates(self):
        # The seeded 35 are already in the schema under the same keys, so the
        # client's copies of those are matched to them rather than duplicated.
        # Everything else is theirs and comes across untouched — including the
        # 51 archived-then-recreated pairs, which are history and not clutter.
        self.write("-- Seeded items already exist; match by key rather than insert.")

        for row in self.rows("maintenance_templates"):
            key = row["template_key"]

            if key:
                self.write(
                    "insert into public.id_map (old_id, new_id) select %s, t.id "
                    "from public.maintenance_templates t where t.template_key = %s;"
                    % (sql_literal(row["id"]), sql_literal(key))
                )
                continue

            self.insert("maintenance_templates", {
                "id": new_id(row["id"]),
                "template_key": None,
                "name": row["name"],
                "category": row["category"],
                "description": row["description"],
                "default_time_interval_days": row["default_time_interval_days"],
                "default_odometer_interval_km": row["default_odometer_interval_km"],
                "default_due_soon_days": row["default_due_soon_days"],
                "default_due_soon_km": row["default_due_soon_km"],
                "priority": row["priority"],
                "is_active": as_bool(row["is_active"]),
                "created_at": as_timestamp(row["created_at"]),
                "updated_at": as_timestamp(row["updated_at"]),
                "deleted_at": as_timestamp(row["deleted_at"]),
            })
            self.write(
                "insert into public.id_map (old_id, new_id) values (%s, %s);"
                % (sql_literal(row["id"]), sql_literal(new_id(row["id"])))
            )

    def template_ref(self, old_id: str | None) -> str:
        """A template id that may belong to a seeded row we did not insert."""
        if not old_id:
            return "null"
        return "(select new_id from public.id_map where old_id = %s)" % sql_literal(old_id)

    def insert_with_template(self, table: str, values: dict, template_old_id: str | None) -> None:
        columns = ", ".join(list(values) + ["template_id"])
        literals = ", ".join(
            [sql_literal(v) for v in values.values()] + [self.template_ref(template_old_id)]
        )
        self.write("insert into public.%s (%s) values (%s);" % (table, columns, literals))
        self.counts[table] = self.counts.get(table, 0) + 1

    def load_template_rules(self):
        # The seeded rules are already in the schema, attached to the seeded
        # items. Re-inserting the client's copies would double every rule and
        # change which items apply to which vehicle.
        self.write("-- Rules for seeded items already exist and are not re-inserted.")

    def load_settings_and_schedules(self):
        for row in self.rows("vehicle_maintenance_settings"):
            self.insert_with_template("vehicle_maintenance_settings", {
                "id": new_id(row["id"]),
                "vehicle_id": new_id(row["vehicle_id"]),
                "status": row["status"],
                "custom_time_interval_days": row["custom_time_interval_days"],
                "custom_odometer_interval_km": row["custom_odometer_interval_km"],
                "custom_due_soon_days": row["custom_due_soon_days"],
                "custom_due_soon_km": row["custom_due_soon_km"],
                "notes": row["notes"],
                "created_at": as_timestamp(row["created_at"]),
                "updated_at": as_timestamp(row["updated_at"]),
                "deleted_at": as_timestamp(row["deleted_at"]),
            }, row["template_id"])

        for row in self.rows("maintenance_schedules"):
            self.insert_with_template("maintenance_schedules", {
                "id": new_id(row["id"]),
                "vehicle_id": new_id(row["vehicle_id"]),
                "vehicle_maintenance_setting_id": new_id(row["vehicle_maintenance_setting_id"]),
                "last_completed_date": as_date(row["last_completed_date"]),
                "last_completed_odometer": row["last_completed_odometer"],
                "next_due_date": as_date(row["next_due_date"]),
                "next_due_odometer": row["next_due_odometer"],
                "due_soon_days": row["due_soon_days"],
                "due_soon_km": row["due_soon_km"],
                "status": row["status"],
                "priority": row["priority"],
                "estimated_cost": row["estimated_cost"],
                "notes": row["notes"],
                "created_at": as_timestamp(row["created_at"]),
                "updated_at": as_timestamp(row["updated_at"]),
                "archived_at": as_timestamp(row["archived_at"]),
                "deleted_at": as_timestamp(row["deleted_at"]),
            }, row["template_id"])

    def load_maintenance_logs(self):
        for row in self.rows("maintenance_logs"):
            self.insert_with_template("maintenance_logs", {
                "id": new_id(row["id"]),
                "vehicle_id": new_id(row["vehicle_id"]),
                "schedule_id": new_id(row["schedule_id"]),
                "completed_date": as_date(row["completed_date"]),
                "odometer": row["odometer"],
                "work_performed": row["work_performed"],
                "parts_replaced": row["parts_replaced"],
                "labor_cost": row["labor_cost"] or 0,
                "parts_cost": row["parts_cost"] or 0,
                "total_cost": row["total_cost"] or 0,
                "mechanic_shop": row["mechanic_shop"],
                "receipt_document_id": new_id(row["receipt_document_id"]),
                "before_photo_id": new_id(row["before_photo_id"]),
                "after_photo_id": new_id(row["after_photo_id"]),
                "warranty_expiration": as_date(row["warranty_expiration"]),
                "next_recommended_date": as_date(row["next_recommended_date"]),
                "next_recommended_odometer": row["next_recommended_odometer"],
                "notes": row["notes"],
                "created_by": self.owner,
                "updated_by": self.owner,
                "created_at": as_timestamp(row["created_at"]),
                "updated_at": as_timestamp(row["updated_at"]),
                "deleted_at": as_timestamp(row["deleted_at"]),
            }, row["template_id"])

    def load_fuel_logs(self):
        for row in self.rows("fuel_logs"):
            self.insert("fuel_logs", {
                "id": new_id(row["id"]),
                "vehicle_id": new_id(row["vehicle_id"]),
                "fuel_date": as_timestamp(row["fuel_date"]),
                "odometer": row["odometer"],
                "fuel_type": row["fuel_type"],
                "liters": row["liters"],
                "price_per_liter": row["price_per_liter"],
                "total_amount": row["total_amount"],
                "station_name": row["station_name"],
                "receipt_number": row["receipt_number"],
                "receipt_document_id": new_id(row["receipt_document_id"]),
                "is_full_tank": as_bool(row["is_full_tank"]),
                "efficiency_status": row["efficiency_status"],
                "computed_km_per_liter": row["computed_km_per_liter"],
                "computed_l_per_100km": row["computed_l_per_100km"],
                "computed_cost_per_km": row["computed_cost_per_km"],
                "notes": row["notes"],
                "created_by": self.owner,
                "updated_by": self.owner,
                "created_at": as_timestamp(row["created_at"]),
                "updated_at": as_timestamp(row["updated_at"]),
                "deleted_at": as_timestamp(row["deleted_at"]),
            })

    def load_trips(self):
        for row in self.rows("trips"):
            self.insert("trips", {
                "id": new_id(row["id"]),
                "vehicle_id": new_id(row["vehicle_id"]),
                "departure_time": as_timestamp(row["departure_time"]),
                "return_time": as_timestamp(row["return_time"]),
                "reason": row["reason"],
                "departure_notes": row["departure_notes"],
                "return_notes": row["return_notes"],
                "status": row["status"],
                "created_by": self.owner,
                "updated_by": self.owner,
                "created_at": as_timestamp(row["created_at"]),
                "updated_at": as_timestamp(row["updated_at"]),
                "deleted_at": as_timestamp(row["deleted_at"]),
            })

        for table, column in [
            ("trip_drivers", "driver_name"),
            ("trip_passengers", "passenger_name"),
            ("trip_destinations", "destination_name"),
        ]:
            for row in self.rows(table, "sort_order"):
                self.insert(table, {
                    "id": new_id(row["id"]),
                    "trip_id": new_id(row["trip_id"]),
                    column: row[column],
                    "sort_order": row["sort_order"],
                    "created_at": as_timestamp(row["created_at"]),
                    "deleted_at": as_timestamp(row["deleted_at"]),
                })

    def load_alerts(self):
        # Dismissed alerts are the reason this table is carried at all. A
        # dismissed alert permanently suppresses that reminder, and the client
        # silenced these deliberately — dropping them would start the nagging
        # again on the two items they had already dealt with.
        for row in self.rows("alerts"):
            self.insert("alerts", {
                "id": new_id(row["id"]),
                "vehicle_id": new_id(row["vehicle_id"]),
                "maintenance_schedule_id": new_id(row["maintenance_schedule_id"]),
                "alert_type": row["alert_type"],
                "priority": row["priority"],
                "title": row["title"],
                "message": row["message"],
                "related_record_type": row["related_record_type"],
                "related_record_id": new_id(row["related_record_id"]),
                "status": row["status"],
                "due_date": as_date(row["due_date"]),
                "snoozed_until": as_timestamp(row["snoozed_until"]),
                "created_at": as_timestamp(row["created_at"]),
                "updated_at": as_timestamp(row["updated_at"]),
                "resolved_at": as_timestamp(row["resolved_at"]),
                "deleted_at": as_timestamp(row["deleted_at"]),
            })

    def load_settings(self):
        # The rows already exist with our defaults; the client's values win.
        # Theirs differ in at least one place that matters — they warn 30 days
        # ahead, not 14.
        for row in self.rows("settings", "key"):
            self.write(
                "update public.settings set value = %s, updated_at = now() where key = %s;"
                % (sql_literal(row["value"]), sql_literal(row["key"]))
            )
            self.counts["settings"] = self.counts.get("settings", 0) + 1

    def run(self):
        self.write("-- Generated by supabase/migrate_from_backup.py. Do not edit by hand.")
        self.write("-- Loads one desktop backup into the hosted database.")
        self.write()
        self.write("begin;")
        self.write()
        self.write("-- Old id to new id, kept for the load and for checking it afterwards.")
        self.write("create table if not exists public.id_map (")
        self.write("  old_id text primary key,")
        self.write("  new_id uuid not null")
        self.write(");")
        self.write()
        self.write("-- Triggers are quiet during the load. They exist to keep one change")
        self.write("-- consistent, and would otherwise recompute the whole fleet a few")
        self.write("-- thousand times on the way in — and raise alerts from half-loaded")
        self.write("-- state. Everything they would have done is done once, at the end.")

        for table in TRIGGER_TABLES:
            self.write("alter table public.%s disable trigger user;" % table)

        self.write()
        for section in [
            ("vehicles", self.load_vehicles),
            ("photos", self.load_photos),
            ("documents", self.load_documents),
            ("maintenance items", self.load_templates),
            ("item rules", self.load_template_rules),
            ("reminders and schedules", self.load_settings_and_schedules),
            ("service history", self.load_maintenance_logs),
            ("fuel", self.load_fuel_logs),
            ("trips", self.load_trips),
            ("alerts", self.load_alerts),
            ("settings", self.load_settings),
        ]:
            name, loader = section
            self.write("-- %s %s" % (name, "-" * (68 - len(name))))
            loader()
            self.write()

        self.write("commit;")
        self.write()
        self.write("-- Switching the triggers back on is its own transaction: the deferred")
        self.write("-- foreign key checks from the load are still outstanding inside the")
        self.write("-- first one, and Postgres will not alter a table with those pending.")
        self.write("begin;")
        self.write()

        for table in TRIGGER_TABLES:
            self.write("alter table public.%s enable trigger user;" % table)

        self.write()
        self.write("-- Now work out what is due, once, with everything in place.")
        self.write("select public.refresh_maintenance_alerts_for_all_vehicles();")
        self.write()
        self.write("-- The mapping goes away with the load. It is worked out from the old")
        self.write("-- id rather than remembered, so this script can rebuild it at any")
        self.write("-- time — and a table left behind in public would be one more thing")
        self.write("-- carrying access rules of its own.")
        self.write("drop table public.id_map;")
        self.write()
        self.write("commit;")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("backup", help="the unpacked .tog5backup directory")
    parser.add_argument("--owner", required=True,
                        help="profile uuid to credit the imported records to")
    parser.add_argument("--files", help="write the file upload list here")
    args = parser.parse_args()

    database = os.path.join(args.backup, "database", "tog5-vms.sqlite3")
    if not os.path.exists(database):
        print("no database in %s" % args.backup, file=sys.stderr)
        return 1

    connection = sqlite3.connect("file:%s?mode=ro" % database.replace(" ", "%20"), uri=True)
    connection.row_factory = sqlite3.Row

    loader = Loader(connection, args.owner, sys.stdout)
    loader.run()

    if args.files:
        with open(args.files, "w", encoding="utf-8", newline="\n") as handle:
            for source, destination in loader.files:
                handle.write("%s\t%s\n" % (source, destination))

    for table, count in sorted(loader.counts.items()):
        print("%-32s %d" % (table, count), file=sys.stderr)
    print("%-32s %d" % ("files to upload", len(loader.files)), file=sys.stderr)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
