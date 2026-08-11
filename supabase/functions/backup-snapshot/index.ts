/**
 * Takes a copy of every row and puts it somewhere the client does not have to
 * remember.
 *
 * The free plan makes no automatic backups. Until this existed, the fleet's
 * only copy of its own records was whatever somebody had last pressed Export
 * on, saved to whichever laptop pressed it.
 *
 * Called by `public.take_snapshot()` through pg_net — nightly from pg_cron, or
 * when the owner presses the button — carrying the same shared secret as the
 * digest. Not reachable from the app.
 *
 * It reads with the service role, which bypasses row level security. That is
 * the point: a backup taken through a signed-in session would silently omit
 * every soft-deleted row, and the archive is exactly what somebody restoring
 * would be looking for.
 *
 * Rows only. The photos and receipts live in Storage already and are no less
 * durable there; copying 34 MB of them into every nightly snapshot would spend
 * the free allowance ten times over without protecting anything the rows are
 * not already protected from. What a snapshot holds is the row saying where
 * each file lives — enough to know one is missing, not enough to rebuild it.
 */

import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * Every table the export in the app covers, in dependency order — the order a
 * human loading this back would want, not that anything here enforces it.
 *
 * `auth.users` is not among them and cannot be: it is unreachable through
 * PostgREST. Rebuilt from a snapshot, the records are whole and the accounts
 * have to be recreated, `profiles.id` being an `auth.users.id`.
 */
const TABLES = [
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
];

/** How many to keep. Ten nightly runs is a week and a half to notice a problem in. */
const KEEP = 10;

/**
 * PostgREST caps a response at a thousand rows by default, and this fleet
 * already has more maintenance schedules than that in one table. Paging is not
 * optional — without it a backup would look successful and be short.
 */
const PAGE = 1000;

const SHARED_SECRET = Deno.env.get("PUSH_SHARED_SECRET");

Deno.serve(async (request) => {
  if (request.headers.get("authorization") !== `Bearer ${SHARED_SECRET}`) {
    return new Response("no", { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let takenBy: string | null = null;

  try {
    takenBy = (await request.json())?.takenBy ?? null;
  } catch {
    // pg_cron sends `{"takenBy": null}`; anything unreadable is treated the
    // same as the nightly run rather than being a reason to skip a backup.
  }

  const tables: Record<string, unknown[]> = {};
  const recordCounts: Record<string, number> = {};

  for (const table of TABLES) {
    const rows: unknown[] = [];

    for (let from = 0; ; from += PAGE) {
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .range(from, from + PAGE - 1);

      if (error) {
        // A partial backup is worse than none: it would sit in the list looking
        // like a restore point and be missing a table nobody checked.
        return Response.json({ error: `${table}: ${error.message}` }, { status: 500 });
      }

      rows.push(...(data ?? []));

      if (!data || data.length < PAGE) {
        break;
      }
    }

    tables[table] = rows;
    recordCounts[table] = rows.length;
  }

  const takenAt = new Date().toISOString();

  const bundle = JSON.stringify({
    appName: "TOG 5 VMS",
    formatVersion: 1,
    takenAt,
    note:
      "Every row of the fleet database. Not the photos and receipts themselves — " +
      "only the rows saying where each one lives — and not the accounts, which " +
      "live outside this database and would need recreating.",
    recordCounts,
    tables,
  });

  const body = new TextEncoder().encode(bundle);
  const storagePath = `snapshot-${takenAt.replace(/[:.]/g, "-")}.json`;

  const upload = await supabase.storage
    .from("backups")
    .upload(storagePath, body, { contentType: "application/json", upsert: false });

  if (upload.error) {
    return Response.json({ error: upload.error.message }, { status: 500 });
  }

  const recorded = await supabase.from("snapshots").insert({
    storage_path: `backups/${storagePath}`,
    size_bytes: body.byteLength,
    record_counts: recordCounts,
    taken_by: takenBy,
  });

  if (recorded.error) {
    // The file is up but unlisted, which would leak one object a night with
    // nothing pointing at it. Take it back out rather than leave that.
    await supabase.storage.from("backups").remove([storagePath]);
    return Response.json({ error: recorded.error.message }, { status: 500 });
  }

  // Prune last, and only once this one is safely recorded — so a failure above
  // never costs the client an older copy that is still good.
  const { data: old } = await supabase
    .from("snapshots")
    .select("id, storage_path")
    .order("created_at", { ascending: false })
    .range(KEEP, KEEP + 100);

  let pruned = 0;

  if (old && old.length > 0) {
    const names = old.map((row) => String(row.storage_path).replace(/^backups\//, ""));
    await supabase.storage.from("backups").remove(names);
    await supabase
      .from("snapshots")
      .delete()
      .in(
        "id",
        old.map((row) => row.id),
      );
    pruned = old.length;
  }

  return Response.json({
    takenAt,
    sizeBytes: body.byteLength,
    records: Object.values(recordCounts).reduce((total, count) => total + count, 0),
    pruned,
  });
});
