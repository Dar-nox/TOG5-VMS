import { rpc } from "./client";

/**
 * The archive, and the way back out of it.
 *
 * Both calls are functions rather than queries, and have to be. Soft-deleted
 * rows are hidden by the read policies, so there is no table here a client can
 * select from — an archived record does not exist as far as PostgREST is
 * concerned. See migration 30.
 */

export type ArchivedKind = "trip" | "fuel" | "expense" | "reminder";

export type ArchivedRecord = {
  kind: ArchivedKind;
  id: string;
  vehicleName: string;
  summary: string;
  /** A second line where there is one: a station, an expense category. */
  detail: string | null;
  amount: number | null;
  /** When the thing happened, not when it was archived. Null for reminders. */
  occurredOn: string | null;
  archivedAt: string;
};

export async function listArchivedRecords(): Promise<ArchivedRecord[]> {
  return rpc<ArchivedRecord[]>("archived_records");
}

export async function restoreRecord(kind: ArchivedKind, id: string): Promise<void> {
  await rpc<void>("restore_record", { kind, record_id: id });
}
