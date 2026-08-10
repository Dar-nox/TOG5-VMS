/**
 * Taking a copy of the records.
 *
 * The desktop build wrote a zip of the SQLite file plus the photo folders, and
 * could restore it. None of that applies now — the database is hosted, and a
 * browser cannot put a file back into it — so this is an export and not a
 * backup system.
 *
 * It still matters, more than it did. The free plan takes no automatic copies,
 * so this file is the only copy of their records the client holds. Each export
 * is recorded in the database, which is what lets Settings say how long it has
 * been since the last one — and it is recorded only once the file has actually
 * left, because a reminder reset by an export nobody has is worse than no
 * reminder.
 */

import { saveTextFile } from "../../lib/saveFile";
import { managedFileUrl, rpc, supabase, unwrap } from "./client";

/**
 * How many snapshots the nightly job keeps. Matches `KEEP` in the
 * `backup-snapshot` function — this is only how many the screen asks for.
 */
const KEPT_SNAPSHOTS = 10;

/** Every table worth keeping, in an order that reads sensibly in the file. */
const EXPORTED_TABLES = [
  "profiles",
  "vehicles",
  "vehicle_photos",
  "vehicle_documents",
  "maintenance_templates",
  "maintenance_template_rules",
  "vehicle_maintenance_settings",
  "maintenance_schedules",
  "maintenance_logs",
  "repair_records",
  "fuel_logs",
  "trips",
  "trip_drivers",
  "trip_passengers",
  "trip_destinations",
  "expenses",
  "alerts",
  "settings",
  "audit_logs",
] as const;

export type ExportSummary = {
  exportedAt: string;
  filename: string;
  sizeBytes: number;
  recordCounts: Record<string, number>;
  totalRecords: number;
};

export type ExportHistoryRecord = {
  id: string;
  exportedBy?: string | null;
  recordCounts: Record<string, number>;
  createdAt: string;
};

export type StorageSummary = {
  photoCount: number;
  documentCount: number;
};

/**
 * One automatic copy of the database, kept server-side.
 *
 * Distinct from an export, which is a file somebody chose to download. These
 * are taken nightly whether or not anyone remembers, because the free plan
 * takes none at all and a backup that depends on a habit is not one.
 */
export type SnapshotRecord = {
  id: string;
  storagePath: string;
  sizeBytes: number;
  recordCounts: Record<string, number>;
  takenBy?: string | null;
  createdAt: string;
};

/**
 * Reads every table and hands the browser one JSON file.
 *
 * Photos and receipts are not in it. They are files rather than records, they
 * are the bulk of the storage, and a browser cannot zip gigabytes without
 * falling over — so the file lists what exists and where, and says plainly
 * that the images themselves stay on the server.
 */
export async function exportAllData(): Promise<ExportSummary> {
  const tables: Record<string, unknown[]> = {};
  const recordCounts: Record<string, number> = {};

  for (const table of EXPORTED_TABLES) {
    const rows = unwrap<unknown[]>(await supabase.from(table).select("*"));
    tables[table] = rows;
    recordCounts[table] = rows.length;
  }

  const exportedAt = new Date().toISOString();
  const contents = {
    appName: "TOG 5 VMS",
    formatVersion: 1,
    exportedAt,
    note:
      "Every record in the fleet database. Photos and receipts are stored as " +
      "files and are not included here; the vehicle_photos and " +
      "vehicle_documents rows list where each one lives.",
    recordCounts,
    tables,
  };

  const filename = `tog5-vms-export-${exportedAt.slice(0, 10)}.json`;

  const outcome = await saveTextFile(
    filename,
    JSON.stringify(contents, null, 2),
    "application/json",
  );

  // Recorded only after the file has actually been handed over, so neither a
  // failed read nor a dismissed share sheet resets the reminder clock on an
  // export the client does not have.
  if (outcome.via === "cancelled") {
    throw new Error("The export was not saved. Nothing has changed.");
  }

  await rpc<string>("record_data_export", { record_counts: recordCounts });

  return {
    exportedAt,
    filename,
    sizeBytes: outcome.sizeBytes,
    recordCounts,
    totalRecords: Object.values(recordCounts).reduce((sum, count) => sum + count, 0),
  };
}

export async function listExports(): Promise<ExportHistoryRecord[]> {
  return unwrap(
    await supabase
      .from("data_exports")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10),
  );
}

/**
 * The restore points held on the server. Owner-only — the policy returns an
 * empty list to anybody else rather than an error.
 */
export async function listSnapshots(): Promise<SnapshotRecord[]> {
  return unwrap(
    await supabase
      .from("snapshots")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(KEPT_SNAPSHOTS),
  );
}

/**
 * Takes one now rather than waiting for tonight.
 *
 * Returns as soon as the job is handed over: the work happens in an Edge
 * Function and pg_net does not wait for it, so the new snapshot appears in the
 * list a moment later rather than by the time this resolves.
 */
export async function takeSnapshot(): Promise<void> {
  await rpc("take_snapshot");
}

/** A link to download one. Signed and short-lived, like every other file here. */
export async function snapshotUrl(storagePath: string): Promise<string | undefined> {
  return managedFileUrl(storagePath);
}

/** What is held as files rather than records, so the screen can say so. */
export async function getStorageSummary(): Promise<StorageSummary> {
  const [photos, documents] = await Promise.all([
    supabase.from("vehicle_photos").select("id", { count: "exact", head: true }),
    supabase.from("vehicle_documents").select("id", { count: "exact", head: true }),
  ]);

  return {
    photoCount: photos.count ?? 0,
    documentCount: documents.count ?? 0,
  };
}
